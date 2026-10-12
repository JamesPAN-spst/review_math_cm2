# 中文逐段直译：构建说明

三章讲义的中文直译，按原文页码（p.N）和段落对齐：每段左栏标出原文的标签或段首词，便于与原 PDF 并排对照；〔译注〕为译者所加。

依赖：`npm i katex@0.16.11 @fontsource/noto-sans-sc@5.1.0 @fontsource/inter@5.1.0 playwright-core`，以及 Chromium。

```
node build_al.js ch1   # 生成 ch1.al.html 与 ch1.al.pdf
```

- `chN.al.src.html`：译文源文件。`@@ a-b | 左栏` 开始一个段落组，a–b 为原文段落块编号；`$…$` / `$$…$$` 为 KaTeX 公式。
- `pagesN.json`：原文每个段落块所在的页（用于生成 p.N 页码标记）。
