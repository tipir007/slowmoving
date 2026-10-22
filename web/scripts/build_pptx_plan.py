"""Rebuild slide 2 + slide 3 from plan.md (24 Sep 2026). Slide 1 (existing) untouched."""

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

PATH = r"d:\Project\Digitalisasi Compound Slow Moving\Alur Compound Slow Moving.pptx"

NAVY = RGBColor(0x1F, 0x3A, 0x5F)
RED = RGBColor(0xC3, 0x1F, 0x16)
OK = RGBColor(0x1F, 0x5C, 0x3C)
AMBER = RGBColor(0x8A, 0x55, 0x12)
INK = RGBColor(0x1A, 0x17, 0x14)
MUTED = RGBColor(0x4A, 0x45, 0x3C)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
CREAM = RGBColor(0xF7, 0xF3, 0xEA)
GOLD = RGBColor(0xE8, 0xC9, 0x8A)
MAJU_BG = RGBColor(0xE7, 0xF1, 0xEA)
MUNDUR_BG = RGBColor(0xF8, 0xE8, 0xE6)
PALE = RGBColor(0xEE, 0xEA, 0xE2)


def set_run(run, text, size, bold=False, color=INK, font="Aptos"):
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = font


def fill_solid(shape, rgb):
    shape.fill.solid()
    shape.fill.fore_color.rgb = rgb


def line_navy(shape, w=1.15):
    shape.line.color.rgb = NAVY
    shape.line.width = Pt(w)


def add_text(shape, lines, valign=MSO_ANCHOR.TOP, pad=0.06):
    tf = shape.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    tf.margin_left = Inches(pad)
    tf.margin_right = Inches(pad)
    tf.margin_top = Inches(0.04)
    tf.margin_bottom = Inches(0.04)
    anchor = {MSO_ANCHOR.TOP: "t", MSO_ANCHOR.MIDDLE: "ctr", MSO_ANCHOR.BOTTOM: "b"}[valign]
    tf._txBody.bodyPr.set("anchor", anchor)
    first = True
    for text, size, bold, color, align in lines:
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        p.alignment = align
        p.clear()
        p.space_after = Pt(1)
        p.space_before = Pt(0)
        set_run(p.add_run(), text, size, bold, color)


def clear_slide(slide):
    for shape in list(slide.shapes):
        shape._element.getparent().remove(shape._element)


def blank_slide(prs):
    # Prefer a truly blank layout; fall back to last layout and strip placeholders.
    layout = None
    for cand in prs.slide_layouts:
        if "blank" in (cand.name or "").lower():
            layout = cand
            break
    if layout is None:
        layout = prs.slide_layouts[min(6, len(prs.slide_layouts) - 1)]
    return prs.slides.add_slide(layout)


def box(slide, l, t, w, h, fill, lines, valign=MSO_ANCHOR.TOP, pad=0.06, bordered=True):
    sh = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(l), Inches(t), Inches(w), Inches(h))
    fill_solid(sh, fill)
    if bordered:
        line_navy(sh)
    else:
        sh.line.fill.background()
    add_text(sh, lines, valign=valign, pad=pad)
    return sh


def build_slide2(slide):
    clear_slide(slide)

    box(slide, 0.22, 0.10, 2.35, 0.34, WHITE, [
        ("DIGITALISASI", 15, True, RED, PP_ALIGN.LEFT),
    ], valign=MSO_ANCHOR.MIDDLE, pad=0.08)

    box(slide, 2.62, 0.10, 10.50, 0.34, WHITE, [
        ("Alur to-be  |  foto+konfirmasi · 1 label di disposisi · gagal trial tidak daftar ulang · histori tercatat · maju/mundur", 11, False, MUTED, PP_ALIGN.LEFT),
    ], valign=MSO_ANCHOR.MIDDLE, pad=0.06, bordered=False)

    box(slide, 0.22, 0.48, 12.90, 0.38, CREAM, [
        ("Leftover / New Creation baru → langkah 1.   Gagal trial → Rak Merah (bukan daftar ulang).   Sumber: BB1, BB2, BB3, BB4, 10in Ext, 8in Ext, Triplex, 3 Roll Cal, 4 Roll Cal, UB Bead, Hexa Bead", 10, False, INK, PP_ALIGN.CENTER),
    ], valign=MSO_ANCHOR.MIDDLE, pad=0.06)

    steps = [
        (
            "1. INPUT",
            "Daftar skid",
            [
                "Foto Mixer Ticket di HP",
                "ML baca field → konfirmasi",
                "Timbang / ketik kg; terkunci",
                "Status: Under Review",
                "PIC: Mixing",
            ],
            "Ganti isi Excel NEW",
        ),
        (
            "2. HOLD",
            "Rak Merah",
            [
                "Stok live: #skid & kg",
                "ID: compound + run + skid",
                "Expiry / retest terlihat",
                "Gagal trial parkir di sini",
                "QC kondisi · Mixing lokasi",
            ],
            "Ganti cek fisik + Excel",
        ),
        (
            "3. ACTION",
            "Siapkan material",
            [
                "Restacking / Pickle Out",
                "Pilih lokasi & kondisi",
                "Submit di HP saja",
                "Belum print, belum ttd",
                "Selesai → antri disposisi",
            ],
            "Tanpa label — update status",
        ),
        (
            "4. PUTUSAN",
            "Disposisi digital",
            [
                "QC: layak / kondisi",
                "PC: aturan pakai & jadwal",
                "Gagal trial: putusan ulang",
                "Ttd = login NIK",
                "Print + tempel · SCAN verify",
            ],
            "★ Satu-satunya titik print",
        ),
        (
            "5. EKSEKUSI",
            "Pakai di mesin",
            [
                "Scan label Ext / Cal / Mix",
                "Catat kg aktual · sisa hidup",
                "ODS 10–20 kg/batch OK",
                "Gagal trial → Rak Merah",
                "Jangan daftar ulang",
            ],
            "Tutup loop kg & sisa",
        ),
        (
            "6. PAPAN",
            "Progress harian",
            [
                "Leftover terdaftar hari itu",
                "Gagal trial tidak mengendap",
                "Snapshot vs kemarin",
                "Review = timeline (slide 3)",
                "Excel hanya export",
            ],
            "MAJU / MUNDUR di bawah",
        ),
    ]

    left = 0.22
    top = 0.94
    gap = 0.12
    n = 6
    usable = 12.90
    bw = (usable - gap * (n - 1)) / n
    bh = 3.02
    head_h = 0.52
    foot_h = 0.38
    body_h = bh - head_h - foot_h

    for i, (kicker, title, body_lines, footer) in enumerate(steps):
        x = left + i * (bw + gap)
        sh = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(top), Inches(bw), Inches(head_h))
        fill_solid(sh, NAVY)
        sh.line.fill.background()
        add_text(
            sh,
            [
                (kicker, 8, True, GOLD, PP_ALIGN.CENTER),
                (title, 12, True, WHITE, PP_ALIGN.CENTER),
            ],
            valign=MSO_ANCHOR.MIDDLE,
            pad=0.03,
        )

        sh = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE, Inches(x), Inches(top + head_h), Inches(bw), Inches(body_h)
        )
        fill_solid(sh, WHITE)
        line_navy(sh, 1.0)
        add_text(
            sh,
            [(line, 9, False, INK, PP_ALIGN.CENTER) for line in body_lines],
            valign=MSO_ANCHOR.MIDDLE,
            pad=0.04,
        )

        sh = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE,
            Inches(x),
            Inches(top + head_h + body_h),
            Inches(bw),
            Inches(foot_h),
        )
        fill_solid(sh, CREAM if i != 3 else RGBColor(0xF4, 0xE4, 0xC4))
        line_navy(sh, 1.0)
        add_text(
            sh,
            [(footer, 8, True, AMBER if i != 3 else RED, PP_ALIGN.CENTER)],
            valign=MSO_ANCHOR.MIDDLE,
            pad=0.03,
        )

        if i < n - 1:
            ax = x + bw + 0.01
            ay = top + 1.28
            ar = slide.shapes.add_shape(
                MSO_SHAPE.RIGHT_ARROW, Inches(ax), Inches(ay), Inches(gap - 0.02), Inches(0.14)
            )
            fill_solid(ar, NAVY)
            ar.line.fill.background()

    box(slide, 0.22, 4.04, 12.90, 0.36, WHITE, [
        ("Dipakai ulang: Triplex, 10in Ext, 8in Ext, 3 Roll Cal, 4 Roll Cal, UB Bead, Hexa Bead    |    Cleaner / Scrap / Gagal Trial ke Rak Merah    |    Print hanya di langkah 4", 10, False, INK, PP_ALIGN.CENTER),
    ], valign=MSO_ANCHOR.MIDDLE, pad=0.06)

    box(slide, 0.22, 4.46, 12.90, 0.28, NAVY, [
        ("6. PAPAN PROGRESS HARIAN  —  leftover terdaftar hari itu, gagal trial tidak mengendap. Tanpa snapshot, maju/mundur mengarang.", 11, True, WHITE, PP_ALIGN.LEFT),
    ], valign=MSO_ANCHOR.MIDDLE, pad=0.10, bordered=False)

    box(slide, 0.22, 4.80, 6.38, 2.48, MAJU_BG, [
        ("MAJU  (progress positif)", 13, True, OK, PP_ALIGN.LEFT),
        ("Total kg & skid Rak Merah turun vs kemarin", 11, False, INK, PP_ALIGN.LEFT),
        ("Plan harian PC tercapai (blend / ODS / pakai)", 11, False, INK, PP_ALIGN.LEFT),
        ("Tag tereksekusi sebelum expired", 11, False, INK, PP_ALIGN.LEFT),
        ("New Creation terdaftar hari itu juga", 11, False, INK, PP_ALIGN.LEFT),
        ("Gagal trial sudah diputus (pakai lagi / scrap)", 11, False, INK, PP_ALIGN.LEFT),
    ], valign=MSO_ANCHOR.TOP, pad=0.12)

    box(slide, 6.74, 4.80, 6.38, 2.48, MUNDUR_BG, [
        ("MUNDUR  (progress negatif)", 13, True, RED, PP_ALIGN.LEFT),
        ("Leftover belum didaftar, stok mengendap", 11, False, INK, PP_ALIGN.LEFT),
        ("Gagal trial tanpa putusan QC / PC / SPV", 11, False, INK, PP_ALIGN.LEFT),
        ("Tag OPEN / kg tidak terpotong", 11, False, INK, PP_ALIGN.LEFT),
        ("Scrap tanpa approval Supervisor", 11, False, INK, PP_ALIGN.LEFT),
        ("Fisik rak tidak sama dengan sistem", 11, False, INK, PP_ALIGN.LEFT),
    ], valign=MSO_ANCHOR.TOP, pad=0.12)


def build_slide3(slide):
    clear_slide(slide)

    box(slide, 0.22, 0.10, 3.10, 0.34, WHITE, [
        ("HISTORI LAPANGAN", 15, True, RED, PP_ALIGN.LEFT),
    ], valign=MSO_ANCHOR.MIDDLE, pad=0.08)

    box(slide, 3.38, 0.10, 9.74, 0.34, WHITE, [
        ("Jawab rapat & audit 1 menit. Bukan 19 sheet. Bukan hanya status terakhir.", 12, False, MUTED, PP_ALIGN.LEFT),
    ], valign=MSO_ANCHOR.MIDDLE, pad=0.06, bordered=False)

    box(slide, 0.22, 0.52, 6.38, 2.22, CREAM, [
        ("DUA JAM — jangan dicampur", 13, True, NAVY, PP_ALIGN.LEFT),
        ("Jam tiket  =  Date / Exp di Mixer Ticket", 11, True, INK, PP_ALIGN.LEFT),
        ("Umur compound, FIFO, retest, lampu exp ≤ 2 hari", 10, False, MUTED, PP_ALIGN.LEFT),
        ("Jam sistem  =  server saat operator bertindak", 11, True, INK, PP_ALIGN.LEFT),
        ("Siapa daftar / edit / dispo / pakai · Asia/Jakarta", 10, False, MUTED, PP_ALIGN.LEFT),
        ("Papan vs kemarin · gagal trial > 24 jam", 10, False, MUTED, PP_ALIGN.LEFT),
        ("Jangan 00:00 palsu. Jangan stempel bundar sebagai jam sistem.", 10, True, AMBER, PP_ALIGN.LEFT),
    ], valign=MSO_ANCHOR.TOP, pad=0.12)

    box(slide, 6.74, 0.52, 6.38, 2.22, CREAM, [
        ("YANG HARUS TERJAWAB DARI SISTEM", 13, True, NAVY, PP_ALIGN.LEFT),
        ("Kapan dicampur / expired?  → mix_at, exp_at", 11, False, INK, PP_ALIGN.LEFT),
        ("Kapan masuk rak, siapa daftar?  → created_at + NIK", 11, False, INK, PP_ALIGN.LEFT),
        ("Kapan potong kg, mesin, sisa?  → baris execution", 11, False, INK, PP_ALIGN.LEFT),
        ("Rak kemarin vs hari ini?  → snapshot harian", 11, False, INK, PP_ALIGN.LEFT),
        ("Siapa edit / pindah, nilai lama?  → skid_event", 11, False, INK, PP_ALIGN.LEFT),
        ("Habis 3 bulan lalu?  tetap di tabel (CONSUMED)", 11, False, INK, PP_ALIGN.LEFT),
    ], valign=MSO_ANCHOR.TOP, pad=0.12)

    box(slide, 0.22, 2.86, 12.90, 0.28, NAVY, [
        ("ENAM ATURAN PRODUKSI  —  bukan aturan IT", 12, True, WHITE, PP_ALIGN.LEFT),
    ], valign=MSO_ANCHOR.MIDDLE, pad=0.10, bordered=False)

    rules = [
        ("1", "Jangan hapus skid\nyang sudah punya kisah.\nHabis = CONSUMED."),
        ("2", "Gagal trial = skid\nyang sama. Daftar ulang\n= histori putus."),
        ("3", "Transaksi tidak menimpa.\nPotong kg / tag / edit\n= baris baru."),
        ("4", "Snapshot harian wajib\n≈06:00 atau tutup shift.\nTanpa itu papan mengarang."),
        ("5", "Export laporan dari\ndatabase. Bukan ketik\nulang sheet NEW."),
        ("6", "Review skid = timeline.\nBukan hanya status\nterakhir di layar."),
    ]
    left = 0.22
    gap = 0.12
    bw = (12.90 - gap * 5) / 6
    for i, (num, text) in enumerate(rules):
        x = left + i * (bw + gap)
        sh = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(3.22), Inches(bw), Inches(0.34))
        fill_solid(sh, RED if i in (0, 1) else NAVY)
        sh.line.fill.background()
        add_text(sh, [(num, 14, True, WHITE, PP_ALIGN.CENTER)], valign=MSO_ANCHOR.MIDDLE, pad=0.02)

        lines = [(ln, 10, False, INK, PP_ALIGN.CENTER) for ln in text.split("\n")]
        box(slide, x, 3.56, bw, 1.28, WHITE, lines, valign=MSO_ANCHOR.MIDDLE, pad=0.05)

    box(slide, 0.22, 4.96, 12.90, 0.28, NAVY, [
        ("JEJAK PER LANGKAH SLIDE 2  —  otomatis dari HP/web, operator tidak mengetik log", 12, True, WHITE, PP_ALIGN.LEFT),
    ], valign=MSO_ANCHOR.MIDDLE, pad=0.10, bordered=False)

    events = [
        ("1 INPUT", "DAFTAR", "NIK, foto, mix/exp"),
        ("2 HOLD", "EDIT", "jika lokasi/kondisi"),
        ("3 ACTION", "RESTACK / PICKLE", "kapan dipindah"),
        ("4 PUTUSAN", "DISPO / PRINT / VERIFY", "tag + jam"),
        ("5 EKSEKUSI", "PAKAI / GAGAL TRIAL", "kg + mesin"),
        ("6 PAPAN", "SNAPSHOT", "kg/skid vs kemarin"),
    ]
    for i, (step, action, bukti) in enumerate(events):
        x = left + i * (bw + gap)
        box(slide, x, 5.32, bw, 1.48, WHITE, [
            (step, 10, True, NAVY, PP_ALIGN.CENTER),
            (action, 11, True, RED, PP_ALIGN.CENTER),
            (bukti, 10, False, MUTED, PP_ALIGN.CENTER),
        ], valign=MSO_ANCHOR.MIDDLE, pad=0.04)

    box(slide, 0.22, 6.90, 12.90, 0.38, PALE, [
        ("Tidak masuk v1: grafik 30 hari · papan malu per NIK · stempel bundar sebagai jam sistem · Excel lama sebagai sumber kebenaran.  Printer fisik belakangan — pratinjau SM1 cukup.", 10, False, MUTED, PP_ALIGN.CENTER),
    ], valign=MSO_ANCHOR.MIDDLE, pad=0.08, bordered=False)


def main():
    prs = Presentation(PATH)
    if len(prs.slides) < 2:
        raise SystemExit("PPT harus punya slide 1 (existing) dan slide 2.")

    build_slide2(prs.slides[1])

    if len(prs.slides) < 3:
        slide3 = blank_slide(prs)
    else:
        slide3 = prs.slides[2]
    # If we added more than 3 historically, leave extras; only rebuild index 2.
    build_slide3(slide3)

    prs.save(PATH)
    print("saved", PATH)
    print("slides", len(prs.slides))


if __name__ == "__main__":
    main()
