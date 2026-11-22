/* ===== File validation helpers =====
 * Validation is intentionally permissive: BIOS sizes differ across revisions,
 * and homebrew ROMs may not carry a commercial header. We warn, never block.
 */
export function parseRomHeader(buf) {
    if (!buf || buf.byteLength < 0x40) return { title: '', code: '', maker: '', size: 0 };
    const bytes = new Uint8Array(buf, 0, Math.min(0x200, buf.byteLength));
    const dec = new TextDecoder('ascii', { fatal: false });
    const clean = (s) => s.replace(/[\x00-\x1f\x7f]+/g, '').trim();
    return {
        title: clean(dec.decode(bytes.subarray(0x00, 0x0c))),
        code: clean(dec.decode(bytes.subarray(0x0c, 0x10))),
        maker: clean(dec.decode(bytes.subarray(0x10, 0x12))),
        size: buf.byteLength,
    };
}

export function validateRom(buf) {
    const header = parseRomHeader(buf);
    const warnings = [];
    if (buf.byteLength < 0x2000) warnings.push('ROM is unusually small');
    if (!header.title) warnings.push('No game title in header');
    return { ok: true, warnings, header };
}

const BIOS_SIZES = {
    arm9: { expected: [0x10000, 0x4000, 0x1000], label: 'ARM9 BIOS' },
    arm7: { expected: [0x4000, 0x1000], label: 'ARM7 BIOS' },
    fw: { expected: [0x40000, 0x80000], label: 'Firmware' },
};

export function validateBios(kind, buf) {
    const spec = BIOS_SIZES[kind];
    if (!spec) return { ok: true, warnings: [] };
    const warnings = [];
    if (!spec.expected.includes(buf.byteLength)) {
        warnings.push(`${spec.label} size ${buf.byteLength} is unexpected`);
    }
    return { ok: true, warnings };
}
