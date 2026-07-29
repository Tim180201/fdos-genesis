import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  digestObject,
  immutableJson,
  jsonClone
} from "../kernel/canonical-json.js";
import {
  AuthorizationError,
  IntegrityError,
  PolicyError,
  ValidationError
} from "../kernel/errors.js";
import {
  assertPlainObject,
  isoDate,
  requiredString
} from "../kernel/validation.js";

const DEFAULT_MAX_DOCUMENT_BYTES = 256 * 1024;
const MAX_GIT_OUTPUT_BYTES = 32 * 1024 * 1024;
const REFERENCE_SNAPSHOT_SCHEMA = "1.0";
const DOCUMENT_EVIDENCE_SCHEMA = "1.0";
const objectIdPattern = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;
const safeReferencePathPattern = /^[a-zA-Z0-9][a-zA-Z0-9._/@+ -]*$/;
const manifestEntryKeys = [
  "byteLength",
  "mode",
  "objectId",
  "path",
  "type"
];
const snapshotKeys = [
  "allowedDocuments",
  "allowlistedChangeCount",
  "branch",
  "capturedAt",
  "commit",
  "kind",
  "manifestDigest",
  "objectFormat",
  "schemaVersion",
  "snapshotDigest",
  "sourceId",
  "sourceState",
  "submoduleCount",
  "symlinkCount",
  "totalBlobBytes",
  "trackedBlobCount",
  "trackedChangeCount",
  "trackedEntryCount",
  "tree",
  "untrackedFileCount"
];
const documentEvidenceKeys = [
  "byteLength",
  "capturedAt",
  "commit",
  "contentSha256",
  "evidenceDigest",
  "filePath",
  "gitObjectId",
  "kind",
  "manifestDigest",
  "schemaVersion",
  "snapshotDigest",
  "sourceId",
  "sourceReference",
  "tree"
];

function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

function validClockValue(clock) {
  const value = clock();
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new ValidationError("Reference-source clock returned an invalid date.");
  }
  return value;
}

function normalizeReferencePath(value, field = "reference path") {
  const source = requiredString(value, field, {
    max: 512,
    pattern: safeReferencePathPattern
  });
  if (
    source !== value ||
    source.includes("\\") ||
    source.startsWith("/") ||
    source.endsWith("/") ||
    source.includes("//")
  ) {
    throw new ValidationError(`${field} must be a canonical relative Git path.`);
  }
  const normalized = path.posix.normalize(source);
  if (
    normalized !== source ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../")
  ) {
    throw new ValidationError(`${field} escapes the configured source.`);
  }
  return normalized;
}

function normalizeAllowedFiles(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 64) {
    throw new ValidationError(
      "Reference source requires between 1 and 64 allowed files."
    );
  }
  const normalized = value.map((entry, index) =>
    normalizeReferencePath(entry, `allowedFiles[${index}]`)
  );
  if (new Set(normalized).size !== normalized.length) {
    throw new ValidationError("Reference-source allowlist contains duplicates.");
  }
  return Object.freeze(normalized);
}

function splitNullDelimited(buffer) {
  const values = [];
  let start = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    if (buffer[index] !== 0) continue;
    values.push(buffer.subarray(start, index));
    start = index + 1;
  }
  if (start !== buffer.length) {
    throw new IntegrityError("Git returned a non-terminated binary record.");
  }
  return values;
}

function decodeUtf8(buffer, field) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    throw new IntegrityError(`${field} is not valid UTF-8.`);
  }
}

function parseManifest(source) {
  const entries = splitNullDelimited(source).map((record, index) => {
    const tab = record.indexOf(9);
    if (tab < 0) {
      throw new IntegrityError(`Malformed Git tree record ${index + 1}.`);
    }
    const metadata = record.subarray(0, tab).toString("ascii").split(/\s+/);
    if (metadata.length !== 4) {
      throw new IntegrityError(`Malformed Git tree metadata ${index + 1}.`);
    }
    const [mode, type, objectId, sizeText] = metadata;
    if (
      !/^[0-7]{6}$/.test(mode) ||
      !["blob", "commit"].includes(type) ||
      !objectIdPattern.test(objectId)
    ) {
      throw new IntegrityError(`Invalid Git tree identity ${index + 1}.`);
    }
    const byteLength = sizeText === "-" ? null : Number(sizeText);
    if (
      byteLength !== null &&
      (!Number.isSafeInteger(byteLength) || byteLength < 0)
    ) {
      throw new IntegrityError(`Invalid Git object size ${index + 1}.`);
    }
    const filePath = decodeUtf8(
      record.subarray(tab + 1),
      `Git tree path ${index + 1}`
    );
    return {
      path: filePath,
      mode,
      type,
      objectId,
      byteLength
    };
  });

  for (let index = 1; index < entries.length; index += 1) {
    if (Buffer.compare(
      Buffer.from(entries[index - 1].path),
      Buffer.from(entries[index].path)
    ) >= 0) {
      throw new IntegrityError("Git tree manifest is not strictly ordered.");
    }
  }
  return entries;
}

function parseStatus(source, allowedFiles) {
  const records = splitNullDelimited(source);
  const allowedBuffers = new Map(
    allowedFiles.map((file) => [file, Buffer.from(file, "utf8")])
  );
  let trackedChangeCount = 0;
  let untrackedFileCount = 0;
  const changedAllowedFiles = new Set();

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (record.length < 4 || record[2] !== 32) {
      throw new IntegrityError("Malformed Git status record.");
    }
    const indexStatus = String.fromCharCode(record[0]);
    const worktreeStatus = String.fromCharCode(record[1]);
    const filePath = record.subarray(3);
    const untracked = indexStatus === "?" && worktreeStatus === "?";
    if (untracked) {
      untrackedFileCount += 1;
    } else {
      trackedChangeCount += 1;
      for (const [allowedFile, allowedBuffer] of allowedBuffers) {
        if (filePath.equals(allowedBuffer)) {
          changedAllowedFiles.add(allowedFile);
        }
      }
    }

    if (
      !untracked &&
      (indexStatus === "R" ||
        indexStatus === "C" ||
        worktreeStatus === "R" ||
        worktreeStatus === "C")
    ) {
      index += 1;
      if (index >= records.length) {
        throw new IntegrityError("Git rename status is incomplete.");
      }
      const sourcePath = records[index];
      for (const [allowedFile, allowedBuffer] of allowedBuffers) {
        if (sourcePath.equals(allowedBuffer)) {
          changedAllowedFiles.add(allowedFile);
        }
      }
    }
  }

  return {
    trackedChangeCount,
    untrackedFileCount,
    changedAllowedFiles: [...changedAllowedFiles].sort()
  };
}

function gitEnvironment() {
  const environment = {
    GIT_CONFIG_GLOBAL: os.devNull,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_PAGER: "cat",
    GIT_TERMINAL_PROMPT: "0",
    LANG: "C",
    LC_ALL: "C"
  };
  if (process.env.PATH) environment.PATH = process.env.PATH;
  if (process.platform === "win32" && process.env.SystemRoot) {
    environment.SystemRoot = process.env.SystemRoot;
  }
  return environment;
}

function executeGit(directory, argumentsList, { maxBuffer } = {}) {
  const gitArguments = [
    "--no-pager",
    "--no-optional-locks",
    "--no-replace-objects",
    "-c",
    "core.fsmonitor=false",
    "-c",
    "core.untrackedCache=false",
    ...argumentsList
  ];
  return new Promise((resolve, reject) => {
    execFile(
      "git",
      gitArguments,
      {
        cwd: directory,
        encoding: "buffer",
        env: gitEnvironment(),
        maxBuffer: maxBuffer || MAX_GIT_OUTPUT_BYTES,
        windowsHide: true
      },
      (error, stdout) => {
        if (error) {
          reject(
            new IntegrityError("Read-only Git reference operation failed.", {
              operation: argumentsList[0] || "unknown",
              exitCode:
                Number.isInteger(error.code) ? error.code : null
            })
          );
          return;
        }
        resolve(Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout));
      }
    );
  });
}

function outputLine(buffer, field, { max = 512, pattern } = {}) {
  return requiredString(decodeUtf8(buffer, field), field, { max, pattern });
}

function unsignedWithDigest(value, digestField) {
  const unsigned = jsonClone(assertPlainObject(value, "digest-bound value"));
  const digest = unsigned[digestField];
  delete unsigned[digestField];
  return { unsigned, digest };
}

function assertExactKeys(value, expectedKeys, field) {
  assertPlainObject(value, field);
  const actualKeys = Object.keys(value).sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw new IntegrityError(`${field} has an unexpected shape.`);
  }
}

function nonNegativeInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new IntegrityError(`${field} must be a non-negative integer.`);
  }
  return value;
}

function sha256Digest(value, field) {
  return requiredString(value, field, {
    max: 71,
    pattern: /^sha256:[0-9a-f]{64}$/
  });
}

function validateManifestEntry(entry, field) {
  assertExactKeys(entry, manifestEntryKeys, field);
  const filePath = normalizeReferencePath(entry.path, `${field}.path`);
  const mode = requiredString(entry.mode, `${field}.mode`, {
    max: 6,
    pattern: /^[0-7]{6}$/
  });
  const type = requiredString(entry.type, `${field}.type`, {
    max: 6,
    pattern: /^(blob|commit)$/
  });
  const objectId = requiredString(entry.objectId, `${field}.objectId`, {
    max: 64,
    pattern: objectIdPattern
  });
  const byteLength =
    entry.byteLength === null
      ? null
      : nonNegativeInteger(entry.byteLength, `${field}.byteLength`);
  if (type === "blob" && byteLength === null) {
    throw new IntegrityError(`${field} blob size is missing.`);
  }
  if (type === "commit" && mode !== "160000") {
    throw new IntegrityError(`${field} commit mode is invalid.`);
  }
  return { path: filePath, mode, type, objectId, byteLength };
}

export function verifyReferenceSnapshot(snapshot) {
  assertExactKeys(snapshot, snapshotKeys, "reference snapshot");
  const { unsigned, digest } = unsignedWithDigest(
    snapshot,
    "snapshotDigest"
  );
  if (
    unsigned.schemaVersion !== REFERENCE_SNAPSHOT_SCHEMA ||
    digestObject(unsigned) !== digest
  ) {
    throw new IntegrityError("Reference snapshot digest mismatch.");
  }
  if (unsigned.kind !== "git-reference-snapshot") {
    throw new IntegrityError("Reference snapshot kind is invalid.");
  }
  requiredString(unsigned.sourceId, "reference snapshot source id", {
    max: 64,
    pattern: /^[a-z][a-z0-9-]{1,63}$/
  });
  isoDate(unsigned.capturedAt, "reference snapshot capturedAt");
  const commit = requiredString(unsigned.commit, "reference snapshot commit", {
    max: 64,
    pattern: objectIdPattern
  });
  const tree = requiredString(unsigned.tree, "reference snapshot tree", {
    max: 64,
    pattern: objectIdPattern
  });
  requiredString(unsigned.branch, "reference snapshot branch", { max: 255 });
  const objectFormat = requiredString(
    unsigned.objectFormat,
    "reference snapshot object format",
    { max: 16, pattern: /^(sha1|sha256)$/ }
  );
  if (
    (objectFormat === "sha1" && commit.length !== 40) ||
    (objectFormat === "sha256" && commit.length !== 64)
  ) {
    throw new IntegrityError(
      "Reference snapshot object format and commit differ."
    );
  }
  requiredString(unsigned.sourceState, "reference snapshot state", {
    max: 32,
    pattern: /^(clean|tracked-clean-with-untracked|tracked-dirty)$/
  });
  for (const field of [
    "trackedEntryCount",
    "trackedBlobCount",
    "symlinkCount",
    "submoduleCount",
    "totalBlobBytes",
    "trackedChangeCount",
    "untrackedFileCount",
    "allowlistedChangeCount"
  ]) {
    nonNegativeInteger(unsigned[field], `reference snapshot ${field}`);
  }
  if (
    !Array.isArray(unsigned.allowedDocuments) ||
    unsigned.allowedDocuments.length < 1 ||
    unsigned.allowedDocuments.length > 64
  ) {
    throw new IntegrityError("Reference snapshot allowlist is invalid.");
  }
  const allowedEntries = unsigned.allowedDocuments.map((entry, index) =>
    validateManifestEntry(entry, `allowedDocuments[${index}]`)
  );
  const allowedPaths = allowedEntries.map((entry) => entry.path);
  if (new Set(allowedPaths).size !== allowedPaths.length) {
    throw new IntegrityError("Reference snapshot allowlist contains duplicates.");
  }
  const expectedObjectIdLength = objectFormat === "sha1" ? 40 : 64;
  if (
    tree.length !== expectedObjectIdLength ||
    allowedEntries.some(
      (entry) => entry.objectId.length !== expectedObjectIdLength
    )
  ) {
    throw new IntegrityError(
      "Reference snapshot object identities use inconsistent formats."
    );
  }
  const expectedState =
    unsigned.trackedChangeCount > 0
      ? "tracked-dirty"
      : unsigned.untrackedFileCount > 0
        ? "tracked-clean-with-untracked"
        : "clean";
  if (
    unsigned.sourceState !== expectedState ||
    unsigned.allowlistedChangeCount > unsigned.trackedChangeCount ||
    unsigned.trackedBlobCount +
      unsigned.symlinkCount +
      unsigned.submoduleCount !== unsigned.trackedEntryCount
  ) {
    throw new IntegrityError("Reference snapshot counts are inconsistent.");
  }
  sha256Digest(unsigned.manifestDigest, "reference snapshot manifest digest");
  sha256Digest(digest, "reference snapshot digest");
  return true;
}

export function verifyReferenceDocumentEvidence(evidence) {
  assertExactKeys(
    evidence,
    documentEvidenceKeys,
    "reference-document evidence"
  );
  const { unsigned, digest } = unsignedWithDigest(
    evidence,
    "evidenceDigest"
  );
  if (
    unsigned.schemaVersion !== DOCUMENT_EVIDENCE_SCHEMA ||
    digestObject(unsigned) !== digest
  ) {
    throw new IntegrityError("Reference-document evidence digest mismatch.");
  }
  if (unsigned.kind !== "git-reference-document") {
    throw new IntegrityError("Reference-document evidence kind is invalid.");
  }
  const sourceId = requiredString(
    unsigned.sourceId,
    "reference evidence source id",
    {
      max: 64,
      pattern: /^[a-z][a-z0-9-]{1,63}$/
    }
  );
  const sourceReference = requiredString(
    unsigned.sourceReference,
    "reference evidence source reference",
    {
      max: 160,
      pattern: /^fdos-ref:[a-z][a-z0-9-]{1,63}:[0-9a-f]{12}:[0-9a-f]{24}$/
    }
  );
  isoDate(unsigned.capturedAt, "reference evidence capturedAt");
  const commit = requiredString(unsigned.commit, "reference evidence commit", {
    max: 64,
    pattern: objectIdPattern
  });
  const tree = requiredString(unsigned.tree, "reference evidence tree", {
    max: 64,
    pattern: objectIdPattern
  });
  sha256Digest(unsigned.manifestDigest, "reference evidence manifest digest");
  sha256Digest(unsigned.snapshotDigest, "reference evidence snapshot digest");
  normalizeReferencePath(unsigned.filePath, "reference evidence file path");
  const gitObjectId = requiredString(
    unsigned.gitObjectId,
    "reference evidence Git object",
    {
      max: 64,
      pattern: objectIdPattern
    }
  );
  if (tree.length !== commit.length || gitObjectId.length !== commit.length) {
    throw new IntegrityError(
      "Reference evidence object identities use inconsistent formats."
    );
  }
  nonNegativeInteger(unsigned.byteLength, "reference evidence byte length");
  const contentSha256 = sha256Digest(
    unsigned.contentSha256,
    "reference evidence content digest"
  );
  const expectedSourceReference = [
    "fdos-ref",
    sourceId,
    commit.slice(0, 12),
    contentSha256.slice(7, 31)
  ].join(":");
  if (sourceReference !== expectedSourceReference) {
    throw new IntegrityError("Reference evidence source reference is inconsistent.");
  }
  sha256Digest(digest, "reference evidence digest");
  return true;
}

export class GitReferenceSource {
  static async open({
    sourceId,
    root,
    allowedFiles,
    maxDocumentBytes = DEFAULT_MAX_DOCUMENT_BYTES,
    clock = () => new Date()
  }) {
    const normalizedSourceId = requiredString(sourceId, "reference source id", {
      max: 64,
      pattern: /^[a-z][a-z0-9-]{1,63}$/
    });
    const normalizedRoot = path.resolve(
      requiredString(root, "reference source root", { max: 4_096 })
    );
    const canonicalRoot = await realpath(normalizedRoot).catch(() => {
      throw new IntegrityError("Reference source root does not exist.");
    });
    const repositoryRoot = outputLine(
      await executeGit(canonicalRoot, ["rev-parse", "--show-toplevel"]),
      "Git repository root",
      { max: 4_096 }
    );
    const canonicalRepositoryRoot = await realpath(repositoryRoot).catch(() => {
      throw new IntegrityError("Git repository root cannot be resolved.");
    });
    if (canonicalRepositoryRoot !== canonicalRoot) {
      throw new PolicyError(
        "Reference source must be configured at the repository root."
      );
    }
    if (
      !Number.isSafeInteger(maxDocumentBytes) ||
      maxDocumentBytes < 1 ||
      maxDocumentBytes > 4 * 1024 * 1024
    ) {
      throw new ValidationError(
        "Reference document limit must be between 1 byte and 4 MiB."
      );
    }
    validClockValue(clock);
    return new GitReferenceSource({
      sourceId: normalizedSourceId,
      root: canonicalRoot,
      allowedFiles: normalizeAllowedFiles(allowedFiles),
      maxDocumentBytes,
      clock
    });
  }

  constructor({
    sourceId,
    root,
    allowedFiles,
    maxDocumentBytes,
    clock
  }) {
    this.sourceId = sourceId;
    this.root = root;
    this.allowedFiles = allowedFiles;
    this.maxDocumentBytes = maxDocumentBytes;
    this.clock = clock;
  }

  async captureSnapshot() {
    const commitBefore = outputLine(
      await executeGit(this.root, ["rev-parse", "HEAD"]),
      "Git commit",
      {
        max: 64,
        pattern: objectIdPattern
      }
    );
    const statusArguments = [
      "status",
      "--porcelain=v1",
      "-z",
      "--untracked-files=all",
      "--"
    ];
    const statusBefore = await executeGit(this.root, statusArguments);
    const [treeBuffer, branchBuffer, objectFormatBuffer, manifestBuffer] =
      await Promise.all([
        executeGit(this.root, ["rev-parse", `${commitBefore}^{tree}`]),
        executeGit(this.root, ["rev-parse", "--abbrev-ref", "HEAD"]),
        executeGit(this.root, ["rev-parse", "--show-object-format"]),
        executeGit(this.root, [
          "ls-tree",
          "-r",
          "-z",
          "-l",
          "--full-tree",
          commitBefore
        ])
      ]);
    const statusAfter = await executeGit(this.root, statusArguments);
    const commitAfter = outputLine(
      await executeGit(this.root, ["rev-parse", "HEAD"]),
      "Git commit",
      {
        max: 64,
        pattern: objectIdPattern
      }
    );
    if (
      commitBefore !== commitAfter ||
      !statusBefore.equals(statusAfter)
    ) {
      throw new IntegrityError(
        "Reference source changed while its snapshot was captured."
      );
    }

    const commit = requiredString(commitBefore, "Git commit", {
      max: 64,
      pattern: objectIdPattern
    });
    const tree = outputLine(treeBuffer, "Git tree", {
      max: 64,
      pattern: objectIdPattern
    });
    const branch = outputLine(branchBuffer, "Git branch", { max: 255 });
    const objectFormat = outputLine(objectFormatBuffer, "Git object format", {
      max: 16,
      pattern: /^(sha1|sha256)$/
    });
    if (
      (objectFormat === "sha1" && commit.length !== 40) ||
      (objectFormat === "sha256" && commit.length !== 64)
    ) {
      throw new IntegrityError("Git object format and commit identity differ.");
    }

    const manifest = parseManifest(manifestBuffer);
    const manifestByPath = new Map(
      manifest.map((entry) => [entry.path, entry])
    );
    const allowedDocuments = this.allowedFiles.map((filePath) => {
      const entry = manifestByPath.get(filePath);
      if (!entry) {
        throw new IntegrityError(
          `Allowed reference document is absent from HEAD: ${filePath}.`
        );
      }
      return jsonClone(entry);
    });
    const status = parseStatus(statusAfter, this.allowedFiles);
    const trackedBlobCount = manifest.filter(
      (entry) => entry.type === "blob" && entry.mode !== "120000"
    ).length;
    const symlinkCount = manifest.filter(
      (entry) => entry.mode === "120000"
    ).length;
    const submoduleCount = manifest.filter(
      (entry) => entry.type === "commit" || entry.mode === "160000"
    ).length;
    const totalBlobBytes = manifest.reduce(
      (sum, entry) => sum + (entry.byteLength || 0),
      0
    );
    const sourceState =
      status.trackedChangeCount > 0
        ? "tracked-dirty"
        : status.untrackedFileCount > 0
          ? "tracked-clean-with-untracked"
          : "clean";
    const unsigned = {
      schemaVersion: REFERENCE_SNAPSHOT_SCHEMA,
      kind: "git-reference-snapshot",
      sourceId: this.sourceId,
      capturedAt: validClockValue(this.clock).toISOString(),
      commit,
      tree,
      branch,
      objectFormat,
      sourceState,
      trackedEntryCount: manifest.length,
      trackedBlobCount,
      symlinkCount,
      submoduleCount,
      totalBlobBytes,
      trackedChangeCount: status.trackedChangeCount,
      untrackedFileCount: status.untrackedFileCount,
      allowlistedChangeCount: status.changedAllowedFiles.length,
      allowedDocuments,
      manifestDigest: digestObject({
        objectFormat,
        entries: manifest
      })
    };
    return immutableJson({
      ...unsigned,
      snapshotDigest: digestObject(unsigned)
    });
  }

  async readDocument(
    relativePath,
    { snapshot = null, requireTrackedClean = true } = {}
  ) {
    const filePath = normalizeReferencePath(relativePath);
    if (!this.allowedFiles.includes(filePath)) {
      throw new AuthorizationError(
        `Reference document is not allowlisted: ${filePath}.`
      );
    }
    const boundSnapshot = snapshot || await this.captureSnapshot();
    verifyReferenceSnapshot(boundSnapshot);
    if (boundSnapshot.sourceId !== this.sourceId) {
      throw new IntegrityError("Reference snapshot belongs to another source.");
    }
    if (requireTrackedClean && boundSnapshot.trackedChangeCount !== 0) {
      throw new PolicyError(
        "Reference source has tracked changes; committed document intake is blocked."
      );
    }
    const entry = boundSnapshot.allowedDocuments.find(
      (candidate) => candidate.path === filePath
    );
    if (!entry) {
      throw new IntegrityError(
        "Reference snapshot does not bind the requested document."
      );
    }
    if (
      entry.type !== "blob" ||
      !["100644", "100755"].includes(entry.mode) ||
      !Number.isSafeInteger(entry.byteLength)
    ) {
      throw new PolicyError(
        "Reference intake accepts regular committed files only."
      );
    }
    if (entry.byteLength > this.maxDocumentBytes) {
      throw new PolicyError(
        `Reference document exceeds the ${this.maxDocumentBytes}-byte limit.`
      );
    }

    const bytes = await executeGit(
      this.root,
      ["cat-file", "blob", entry.objectId],
      { maxBuffer: this.maxDocumentBytes + 1 }
    );
    if (bytes.length !== entry.byteLength) {
      throw new IntegrityError("Reference document size differs from Git tree.");
    }
    const content = decodeUtf8(bytes, "Reference document");
    const contentSha256 = `sha256:${sha256Bytes(bytes)}`;
    const sourceReference = [
      "fdos-ref",
      this.sourceId,
      boundSnapshot.commit.slice(0, 12),
      contentSha256.slice(7, 31)
    ].join(":");
    const unsignedEvidence = {
      schemaVersion: DOCUMENT_EVIDENCE_SCHEMA,
      kind: "git-reference-document",
      sourceId: this.sourceId,
      sourceReference,
      capturedAt: boundSnapshot.capturedAt,
      commit: boundSnapshot.commit,
      tree: boundSnapshot.tree,
      manifestDigest: boundSnapshot.manifestDigest,
      snapshotDigest: boundSnapshot.snapshotDigest,
      filePath,
      gitObjectId: entry.objectId,
      byteLength: bytes.length,
      contentSha256
    };
    const evidence = immutableJson({
      ...unsignedEvidence,
      evidenceDigest: digestObject(unsignedEvidence)
    });
    return Object.freeze({ content, evidence });
  }
}
