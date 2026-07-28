import { describe, expect, it } from "vitest";

import {
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  MediaValidationError,
  assertUploadIsAllowed,
  buildObjectKey,
  mediaUrl,
} from "@/lib/media";
import { normalizeHostname } from "@/lib/village";
import { newTicket, slugify } from "@/lib/id";

describe("upload validation", () => {
  it("accepts every allowlisted type", () => {
    for (const mime of Object.keys(ALLOWED_MIME_TYPES)) {
      expect(() => assertUploadIsAllowed(mime, 1024)).not.toThrow();
    }
  });

  it("rejects executable and markup types", () => {
    for (const mime of ["application/x-sh", "text/html", "image/svg+xml"]) {
      expect(() => assertUploadIsAllowed(mime, 1024)).toThrow(MediaValidationError);
    }
  });

  it("rejects empty and oversized files", () => {
    expect(() => assertUploadIsAllowed("image/png", 0)).toThrow(MediaValidationError);
    expect(() => assertUploadIsAllowed("image/png", MAX_UPLOAD_BYTES + 1)).toThrow(
      MediaValidationError,
    );
    expect(() => assertUploadIsAllowed("image/png", MAX_UPLOAD_BYTES)).not.toThrow();
  });
});

describe("object keys", () => {
  const now = new Date("2026-03-09T10:00:00.000Z");

  it("namespaces by village and date so tenants cannot collide", () => {
    const key = buildObjectKey({
      villageId: "vil_abc",
      fileName: "Foto Kegiatan.PNG",
      mimeType: "image/png",
      now,
    });
    expect(key.startsWith("vil_abc/2026/03/")).toBe(true);
    expect(key.endsWith(".png")).toBe(true);
  });

  it("produces a distinct key for identical filenames", () => {
    const args = {
      villageId: "vil_abc",
      fileName: "sama.png",
      mimeType: "image/png",
      now,
    };
    expect(buildObjectKey(args)).not.toBe(buildObjectKey(args));
  });

  it("strips path traversal out of the supplied name", () => {
    const key = buildObjectKey({
      villageId: "vil_abc",
      fileName: "../../etc/passwd.png",
      mimeType: "image/png",
      now,
    });
    expect(key).not.toContain("..");
    expect(key.split("/")).toHaveLength(4); // village/year/month/file
  });

  it("uses the extension of the declared type, not the filename", () => {
    const key = buildObjectKey({
      villageId: "vil_abc",
      fileName: "menipu.html",
      mimeType: "application/pdf",
      now,
    });
    expect(key.endsWith(".pdf")).toBe(true);
  });
});

describe("media urls", () => {
  it("routes through the access-checked handler", () => {
    expect(mediaUrl("med_1")).toBe("/media/med_1");
    expect(mediaUrl(null)).toBeNull();
    expect(mediaUrl(undefined)).toBeNull();
  });
});

describe("tenant hostname resolution", () => {
  it("ignores port, case and the www prefix", () => {
    expect(normalizeHostname("WWW.Desa.Example:8787")).toBe("desa.example");
    expect(normalizeHostname("desa.example")).toBe("desa.example");
  });

  it("returns an empty string for missing hosts", () => {
    expect(normalizeHostname(null)).toBe("");
    expect(normalizeHostname(undefined)).toBe("");
  });
});

describe("identifiers", () => {
  it("builds readable tickets without ambiguous characters", () => {
    const ticket = newTicket("PGD");
    expect(ticket).toMatch(/^PGD-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  });

  it("slugifies Indonesian titles", () => {
    expect(slugify("Musyawarah Desa 2026!")).toBe("musyawarah-desa-2026");
    expect(slugify("   ")).toBe("item");
  });
});
