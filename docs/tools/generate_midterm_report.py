from __future__ import annotations

import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor


ROOT = Path(__file__).resolve().parents[2]
ASSET_DIR = ROOT / "docs" / "assets" / "midterm"
OUTPUT_PATH = ROOT / "docs" / "智览时政_中期说明.docx"
DATABASE_PATH = ROOT / "data" / "zhilan.db"

BODY_FONT = "宋体"
HEADING_FONT = "微软雅黑"
BLACK = RGBColor(0, 0, 0)


def set_run_font(run, name: str, size: float | None = None, bold: bool = False) -> None:
    run.font.name = name
    run.font.bold = bold
    run.font.color.rgb = BLACK
    if size is not None:
        run.font.size = Pt(size)
    fonts = run._element.get_or_add_rPr().get_or_add_rFonts()
    fonts.set(qn("w:ascii"), name)
    fonts.set(qn("w:hAnsi"), name)
    fonts.set(qn("w:eastAsia"), name)


def configure_styles(doc: Document) -> None:
    normal = doc.styles["Normal"]
    normal.font.name = BODY_FONT
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = BLACK
    normal._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:eastAsia"), BODY_FONT)
    normal.paragraph_format.line_spacing = 1.35
    normal.paragraph_format.space_after = Pt(4)

    title = doc.styles["Title"]
    title.font.name = HEADING_FONT
    title.font.size = Pt(20)
    title.font.bold = True
    title.font.color.rgb = BLACK
    title._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:eastAsia"), HEADING_FONT)

    for style_name, size in (("Heading 1", 14), ("Heading 2", 11.5)):
        style = doc.styles[style_name]
        style.font.name = HEADING_FONT
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = BLACK
        style._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:eastAsia"), HEADING_FONT)
        style.paragraph_format.space_before = Pt(10)
        style.paragraph_format.space_after = Pt(5)


def set_cell_shading(cell, fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shading = tc_pr.find(qn("w:shd"))
    if shading is None:
        shading = OxmlElement("w:shd")
        tc_pr.append(shading)
    shading.set(qn("w:fill"), fill)


def set_cell_text(
    cell,
    text: str,
    *,
    bold: bool = False,
    size: float = 10,
    align=WD_ALIGN_PARAGRAPH.LEFT,
) -> None:
    cell.text = ""
    paragraph = cell.paragraphs[0]
    paragraph.alignment = align
    paragraph.paragraph_format.space_after = Pt(0)
    paragraph.paragraph_format.line_spacing = 1.2
    run = paragraph.add_run(text)
    set_run_font(run, BODY_FONT, size=size, bold=bold)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER


def set_cell_width(cell, width_cm: float) -> None:
    cell.width = Cm(width_cm)
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_w = tc_pr.find(qn("w:tcW"))
    if tc_w is None:
        tc_w = OxmlElement("w:tcW")
        tc_pr.append(tc_w)
    tc_w.set(qn("w:w"), str(int(width_cm * 567)))
    tc_w.set(qn("w:type"), "dxa")


def keep_rows_together(table, *, repeat_header: bool = False) -> None:
    for row in table.rows:
        row_properties = row._tr.get_or_add_trPr()
        if row_properties.find(qn("w:cantSplit")) is None:
            row_properties.append(OxmlElement("w:cantSplit"))
    if repeat_header:
        header_properties = table.rows[0]._tr.get_or_add_trPr()
        if header_properties.find(qn("w:tblHeader")) is None:
            header_properties.append(OxmlElement("w:tblHeader"))


def remove_border_from_element(element) -> None:
    properties = element.get_or_add_pPr()
    border = properties.find(qn("w:pBdr"))
    if border is not None:
        properties.remove(border)


def remove_paragraph_border(paragraph) -> None:
    remove_border_from_element(paragraph._p)


def remove_style_border(style) -> None:
    remove_border_from_element(style.element)


def add_basic_information(doc: Document) -> None:
    table = doc.add_table(rows=7, cols=2)
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    rows = [
        ("队名", "____________________________"),
        ("作品名称", "智览时政：海内外新闻智能聚合与多视角分析平台"),
        ("作品门类", "工具与应用类"),
        ("队长及联系方式", "____________________________"),
        ("成员（4人）", "____________________________"),
        ("提交日期", "2026年11月24日"),
        (
            "一句话说明",
            "面向移动端的多源新闻聚合与来源追溯原型，已完成新闻展示、真实 RSS 数据接入和信源采集基础。",
        ),
    ]

    for row, (label, value) in zip(table.rows, rows, strict=True):
        set_cell_width(row.cells[0], 3.3)
        set_cell_width(row.cells[1], 13.3)
        set_cell_text(row.cells[0], label, bold=True, size=10)
        set_cell_text(row.cells[1], value, size=10)
        set_cell_shading(row.cells[0], "F2F2F2")
    keep_rows_together(table)


def read_database_summary() -> dict[str, str]:
    if not DATABASE_PATH.exists():
        return {
            "news": "未读取",
            "publishers": "未读取",
            "sources": "未读取",
            "valid": "未读取",
        }
    with sqlite3.connect(DATABASE_PATH) as connection:
        news_count = connection.execute("SELECT COUNT(*) FROM news").fetchone()[0]
        publisher_count = connection.execute(
            "SELECT COUNT(DISTINCT source_id) FROM news"
        ).fetchone()[0]
        source_count = connection.execute("SELECT COUNT(*) FROM news_sources").fetchone()[0]
        valid_count = connection.execute(
            "SELECT COUNT(*) FROM news_sources WHERE last_validation_status = 'valid'"
        ).fetchone()[0]
    return {
        "news": f"{news_count} 条",
        "publishers": f"{publisher_count} 家",
        "sources": f"{source_count} 个",
        "valid": f"{valid_count} 个",
    }


def add_status_summary(doc: Document) -> None:
    summary = read_database_summary()
    table = doc.add_table(rows=2, cols=4)
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ("本地入库新闻", "覆盖媒体", "候选信源", "已验证 RSS")
    values = (summary["news"], summary["publishers"], summary["sources"], summary["valid"])
    for index, (header, value) in enumerate(zip(headers, values, strict=True)):
        set_cell_width(table.rows[0].cells[index], 4.1)
        set_cell_width(table.rows[1].cells[index], 4.1)
        set_cell_text(
            table.rows[0].cells[index],
            header,
            bold=True,
            size=9.5,
            align=WD_ALIGN_PARAGRAPH.CENTER,
        )
        set_cell_text(
            table.rows[1].cells[index],
            value,
            bold=True,
            size=11,
            align=WD_ALIGN_PARAGRAPH.CENTER,
        )
        set_cell_shading(table.rows[0].cells[index], "F2F2F2")
    keep_rows_together(table)


def add_milestone_table(doc: Document, items: list[dict[str, str]]) -> None:
    table = doc.add_table(rows=1, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    for cell, item in zip(table.rows[0].cells, items, strict=True):
        set_cell_width(cell, 8.3)
        cell.text = ""
        title = cell.paragraphs[0]
        title.paragraph_format.space_after = Pt(3)
        title_run = title.add_run(item["title"])
        set_run_font(title_run, HEADING_FONT, size=11, bold=True)

        body = cell.add_paragraph()
        body.paragraph_format.space_after = Pt(3)
        body.paragraph_format.line_spacing = 1.2
        body_run = body.add_run(item["body"])
        set_run_font(body_run, BODY_FONT, size=9)

        picture = cell.add_paragraph()
        picture.alignment = WD_ALIGN_PARAGRAPH.CENTER
        picture.paragraph_format.space_after = Pt(2)
        picture.add_run().add_picture(str(ASSET_DIR / item["image"]), width=Cm(5.8))

        caption = cell.add_paragraph()
        caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
        caption.paragraph_format.space_after = Pt(0)
        caption_run = caption.add_run(item["caption"])
        set_run_font(caption_run, BODY_FONT, size=8)
    keep_rows_together(table)


def add_bullet(doc: Document, text: str) -> None:
    paragraph = doc.add_paragraph(style="List Bullet")
    paragraph.paragraph_format.space_after = Pt(3)
    paragraph.paragraph_format.line_spacing = 1.3
    run = paragraph.add_run(text)
    set_run_font(run, BODY_FONT, size=10.5)


def add_hyperlink(paragraph, text: str, url: str) -> None:
    part = paragraph.part
    relationship_id = part.relate_to(
        url,
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
        is_external=True,
    )
    hyperlink = OxmlElement("w:hyperlink")
    hyperlink.set(qn("r:id"), relationship_id)
    run = OxmlElement("w:r")
    properties = OxmlElement("w:rPr")
    color = OxmlElement("w:color")
    color.set(qn("w:val"), "1F4E79")
    underline = OxmlElement("w:u")
    underline.set(qn("w:val"), "single")
    properties.extend([color, underline])
    run.append(properties)
    text_element = OxmlElement("w:t")
    text_element.text = text
    run.append(text_element)
    hyperlink.append(run)
    paragraph._p.append(hyperlink)


def add_demo_links(doc: Document) -> None:
    addresses = [
        ("手机端新闻首页", "http://127.0.0.1:3000/app"),
        ("信源管理页", "http://127.0.0.1:3000/app/sources"),
        ("FastAPI 接口文档", "http://127.0.0.1:8000/docs"),
    ]
    for label, url in addresses:
        paragraph = doc.add_paragraph()
        paragraph.paragraph_format.space_after = Pt(2)
        label_run = paragraph.add_run(f"{label}：")
        set_run_font(label_run, BODY_FONT, size=10)
        add_hyperlink(paragraph, url, url)


def add_plan_table(doc: Document) -> None:
    rows = [
        ("第1周", "完成正式网络环境复验，冻结首批可用信源及许可状态。", "成员3、成员1"),
        ("第2周", "补充新闻分类规则、中文摘要流水线和详情接口。", "成员1、成员4"),
        ("第3周", "接入本地多语言向量模型，制作同一事件匹配原型。", "成员1、成员3"),
        ("第4周", "实现事件聚合、多来源对照与来源追溯界面联调。", "成员2、成员4"),
        ("第5周", "部署鉴权、跨网络测试、性能检查和演示彩排。", "成员4、成员2"),
    ]
    table = doc.add_table(rows=1, cols=3)
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ("时间", "工作计划与验收内容", "负责人")
    for cell, text in zip(table.rows[0].cells, headers, strict=True):
        set_cell_width(cell, (2.3, 11.8, 2.6)[headers.index(text)])
        set_cell_text(cell, text, bold=True, size=9.5, align=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell_shading(cell, "F2F2F2")
    for week, task, owner in rows:
        cells = table.add_row().cells
        set_cell_width(cells[0], 2.3)
        set_cell_width(cells[1], 11.8)
        set_cell_width(cells[2], 2.6)
        set_cell_text(cells[0], week, bold=True, size=9)
        set_cell_text(cells[1], task, size=9)
        set_cell_text(cells[2], owner, size=9, align=WD_ALIGN_PARAGRAPH.CENTER)
    keep_rows_together(table, repeat_header=True)


def add_resource_table(doc: Document) -> None:
    rows = [
        ("公网 Linux 服务器", "4 核 CPU、8 GB 内存、100 GB 磁盘；用于前后端与数据库部署", "1 台，至少 1 个月"),
        ("域名和 HTTPS", "手机扫码访问、反向代理与接口同源访问", "1 套，至少 1 个月"),
        ("中国大陆网络测试", "从真实移动网络复验海外 RSS 可达性与超时表现", "1 天测试窗口"),
        ("版权与再分发指导", "确认 RSS 标题、摘要和链接的公开展示范围", "1 次专项答疑"),
    ]
    table = doc.add_table(rows=1, cols=3)
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ("资源", "用途", "数量 / 时间")
    for index, (cell, text) in enumerate(zip(table.rows[0].cells, headers, strict=True)):
        set_cell_width(cell, (4.0, 9.2, 3.5)[index])
        set_cell_text(cell, text, bold=True, size=9.5, align=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell_shading(cell, "F2F2F2")
    for resource, purpose, amount in rows:
        cells = table.add_row().cells
        set_cell_width(cells[0], 4.0)
        set_cell_width(cells[1], 9.2)
        set_cell_width(cells[2], 3.5)
        set_cell_text(cells[0], resource, size=9, bold=True)
        set_cell_text(cells[1], purpose, size=9)
        set_cell_text(cells[2], amount, size=9)
    keep_rows_together(table, repeat_header=True)


def add_roles_table(doc: Document) -> None:
    rows = [
        ("成员1", "后端架构、数据库与 API", "负责 FastAPI 服务、SQLite 数据模型、采集调度和接口联调。"),
        ("成员2", "前端页面与移动交互", "负责 Next.js 页面、液态玻璃组件、推荐/关注/详情交互和手机适配。"),
        ("成员3", "信源、标准化与匹配算法", "负责 RSS/Atom 选源、数据清洗、来源验证和后续事件匹配模型。"),
        ("成员4", "质量、部署与项目管理", "负责自动化测试、信源管理验收、Docker/服务器部署和文档交付。"),
    ]
    table = doc.add_table(rows=1, cols=3)
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for index, (cell, text) in enumerate(zip(table.rows[0].cells, ("成员", "主要职责", "具体工作"), strict=True)):
        set_cell_width(cell, (2.2, 4.4, 10.1)[index])
        set_cell_text(cell, text, bold=True, size=9.5, align=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell_shading(cell, "F2F2F2")
    for member, role, work in rows:
        cells = table.add_row().cells
        set_cell_width(cells[0], 2.2)
        set_cell_width(cells[1], 4.4)
        set_cell_width(cells[2], 10.1)
        set_cell_text(cells[0], member, size=9, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell_text(cells[1], role, size=9)
        set_cell_text(cells[2], work, size=9)
    keep_rows_together(table, repeat_header=True)


def build_document() -> None:
    doc = Document()
    configure_styles(doc)
    section = doc.sections[0]
    section.start_type = WD_SECTION.NEW_PAGE
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(2.0)
    section.bottom_margin = Cm(2.0)
    section.left_margin = Cm(2.1)
    section.right_margin = Cm(2.1)

    properties = doc.core_properties
    properties.title = "智览时政项目中期说明"
    properties.subject = "项目当前进展、问题与下一步计划"
    properties.author = "智览时政项目组"
    properties.last_modified_by = "智览时政项目组"
    now = datetime.now(timezone.utc)
    properties.created = now
    properties.modified = now

    title = doc.add_paragraph(style="Title")
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    remove_style_border(doc.styles["Title"])
    remove_paragraph_border(title)
    title_run = title.add_run("智览时政项目中期说明")
    set_run_font(title_run, HEADING_FONT, size=20, bold=True)

    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle.paragraph_format.space_after = Pt(10)
    subtitle_run = subtitle.add_run("项目进度、当前卡点与下一阶段安排")
    set_run_font(subtitle_run, BODY_FONT, size=10.5)

    opening = doc.add_paragraph()
    opening.paragraph_format.first_line_indent = Cm(0.74)
    opening_run = opening.add_run(
        "本说明汇报智览时政项目截至 2026 年 11 月 24 日的建设情况。项目已经形成可本地运行的移动端新闻聚合原型，"
        "完成真实 RSS 新闻接入、来源追溯界面和基础信源管理；跨媒体事件识别、自动分类和智能摘要仍需在后续阶段完成。"
    )
    set_run_font(opening_run, BODY_FONT, size=10.5)

    doc.add_heading("一、基本信息", level=1)
    add_basic_information(doc)
    doc.add_heading("当前数据概览", level=2)
    add_status_summary(doc)
    note = doc.add_paragraph()
    note.paragraph_format.space_before = Pt(4)
    note_run = note.add_run(
        "注：概览数据来自本地 SQLite 数据库；新闻正文和图片未入库，当前仅保存 RSS 提供的标题、摘要、发布时间和原文链接。"
    )
    set_run_font(note_run, BODY_FONT, size=8.5)

    doc.add_page_break()
    doc.add_heading("二、已完成的工作", level=1)
    intro = doc.add_paragraph()
    intro_run = intro.add_run(
        "目前可演示四项成果，截图均取自 2026 年 11 月 24 日的本地运行页面。真实新闻来自后端 API，"
        "分类体验页中的内置演示内容会显示“演示”标记，不会冒充实时新闻。"
    )
    set_run_font(intro_run, BODY_FONT, size=10.5)

    add_milestone_table(
        doc,
        [
            {
                "title": "1. 移动端新闻聚合首页",
                "body": "完成手机尺寸的新闻情报首页，顶部保留“推荐/关注”，新闻按时间排序并以液态玻璃卡片展示。桌面预览固定为 393 × 852，与手机断点保持一致。",
                "image": "01-live-home.png",
                "caption": "图1  真实 API 新闻首页（后端事件，时间 2026-11-09）",
            },
            {
                "title": "2. 推荐分类与关注视图",
                "body": "点击“推荐”可展开全部、国际、科技、经济、社会、环境和防务七个筛选项，并即时过滤新闻流；“关注”保存于浏览器本地。",
                "image": "02-category-filter.png",
                "caption": "图2  推荐分类面板与移动端信息布局",
            },
        ],
    )

    doc.add_page_break()
    add_milestone_table(
        doc,
        [
            {
                "title": "3. 事件详情与来源追溯",
                "body": "点击新闻卡片可打开可上下滑动的事件详情层，展示事件关联、来源机构、发布时间、语言和“原文”链接，为后续多来源对照保留界面结构。",
                "image": "03-event-detail.png",
                "caption": "图3  真实后端事件详情与可点击原文链接",
            },
            {
                "title": "4. 信源采集与管理",
                "body": "已完成 RSS/Atom 采集、失败重试、暂停恢复、手动/定时采集和日志记录。管理页可查看 15 个候选信源的状态，并手动触发采集。",
                "image": "04-source-admin.png",
                "caption": "图4  信源管理页（15 个来源，9 个当前启用）",
            },
        ],
    )

    doc.add_page_break()
    doc.add_heading("三、当前进展与演示方式", level=1)
    progress = doc.add_paragraph()
    progress_run = progress.add_run(
        "当前版本是“可运行、可验证功能链路”的原型，不是最终公网成品。首页已经可以使用真实入库新闻；"
        "信源管理页能够展示真实验证状态；事件聚合和 AI 生成内容尚未接入。"
    )
    set_run_font(progress_run, BODY_FONT, size=10.5)

    add_demo_links(doc)
    local_note = doc.add_paragraph()
    local_note_run = local_note.add_run(
        "上述地址只在本地服务启动后有效。目前尚未部署公网域名，因此不将本地地址作为对外演示链接。"
    )
    set_run_font(local_note_run, BODY_FONT, size=9)

    command = doc.add_paragraph()
    command.paragraph_format.left_indent = Cm(0.6)
    command.paragraph_format.space_before = Pt(5)
    command.paragraph_format.space_after = Pt(8)
    command_run = command.add_run(
        "后端：.\\\\.venv\\\\Scripts\\\\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000\n"
        "前端：cd frontend; pnpm dev --hostname 127.0.0.1 --port 3000"
    )
    set_run_font(command_run, "Consolas", size=8.5)

    doc.add_heading("四、存在的问题与困难", level=1)
    problems = [
        "跨媒体同一事件识别尚未实现。当前 522 条真实新闻仍以单来源报道展示，事件聚类和置信度评估仍是下一阶段的核心技术难点。",
        "信源许可和再分发范围尚未逐个完成审核。为规避版权风险，系统只保存 RSS 标题、摘要、发布时间和原文链接，暂不抓取正文和图片。",
        "海外 RSS 在中国大陆正式部署网络的可用性仍需复验。IMF 当前返回 403，新华网 feed 内容过期，国家统计局英文 feed 的 XML 结构不合格。",
        "公网部署、登录鉴权和操作审计尚未完成。信源管理页包含采集、暂停等写操作，目前只适合在本地或受信网络中运行。",
        "新闻标题和摘要仍以英文原文为主，中文摘要、自动分类和本地多语言向量匹配需要继续开发和评估。",
    ]
    for problem in problems:
        add_bullet(doc, problem)

    doc.add_heading("五、下一步计划", level=1)
    plan_intro = doc.add_paragraph()
    plan_run = plan_intro.add_run("按游园会前的五周倒排，周计划与负责人如下。")
    set_run_font(plan_run, BODY_FONT, size=10.5)
    add_plan_table(doc)

    doc.add_page_break()
    doc.add_heading("六、需求或疑问", level=1)
    resource_intro = doc.add_paragraph()
    resource_run = resource_intro.add_run("为完成公网演示和真实网络复验，希望赛事组协助协调以下资源。")
    set_run_font(resource_run, BODY_FONT, size=10.5)
    add_resource_table(doc)

    doc.add_heading("七、成员分工", level=1)
    add_roles_table(doc)

    doc.add_heading("八、相关情况申报", level=1)
    declaration = doc.add_paragraph()
    declaration.paragraph_format.first_line_indent = Cm(0.74)
    declaration_run = declaration.add_run(
        "赛前基础：团队具备前端、后端和数据采集开发基础。项目使用 Next.js、FastAPI、SQLite、feedparser 等开源组件，均按相应许可证使用；"
        "未复制其他参赛作品代码。当前未使用导师、外部付费服务或他人定制帮助；后续如引入外部素材、数据集或技术服务，将在使用前完成申报。"
    )
    set_run_font(declaration_run, BODY_FONT, size=10.5)

    doc.save(OUTPUT_PATH)
    print(OUTPUT_PATH)


if __name__ == "__main__":
    build_document()
