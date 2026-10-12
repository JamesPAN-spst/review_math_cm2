# 中文译本构建

依赖：`npm i katex@0.16.11 @fontsource/noto-sans-sc@5.1.0 playwright-core`，以及 Chromium。

```
node build.js ch1   # 生成 ch1.html 与 ch1.pdf
```

`chN.src.html` 为译文源文件（`$…$` / `$$…$$` 为 KaTeX 公式，`<env>` 为定义/定理/证明块）。
