# AGENTS.md：给 Codex 等编码代理的工作说明

本仓库是文字冒险游戏《双十字》。剧情完成后，待做的工作是**补齐美术与音频素材**。

## 素材任务

1. 读 `assets/manifest.json`。`slots` 数组里的每一项是一个素材插槽：
   - `file`：必须生成到的路径，文件名一字不差（中文文件名照用）。
   - `type`：`bg` 场景背景、`cg` 事件图、`char` 人物立绘、`bgm` 配乐、`sfx` 音效。
   - `prompt`：生成提示词，已包含统一画风 / 音乐风格要求和该插槽的具体描述。
   - `spec`：尺寸与格式要求。
   - `present`：`true` 表示文件已存在，跳过。
   - `used_in`：用到它的"话"号，可到 `script/chapters/` 里搜 `## 第N话` 看上下文。
2. 人物一致性：`manifest.json` 的 `characters` 是每个人物的外貌设定。**先生成每个人物的 `<人物>_常态.png`**，再以它为参考图生成该人物的其余表情与服装，保证脸型、发型、年龄一致。
3. 背景：同一地点（文件名下划线前的部分相同）的不同时间与天气，保持同一构图，只改光线与天气。
4. 规格：
   - 背景、事件图：1920×1080 JPG，单张不超过 600KB。
   - 立绘：1024×1536 透明背景 PNG，脸在画面上部三分之一，游戏会裁成圆形头像。
   - 配乐：MP3，可无缝循环，60–150 秒。
   - 音效：MP3，0.5–4 秒，开头不留空白。
5. 所有配乐必须是原创旋律，不要使用或模仿已有曲目；画面中不要出现可读文字或水印。
6. 生成后运行 `python3 tools/build.py`，它会把 `present` 更新为 `true` 并重新生成 `index.html`。提交 `assets/` 下的新文件，以及更新后的 `assets/manifest.json`、`assets/README.md`、`index.html`。

可以分批完成。一次只做一类或一个人物也没关系，缺失的插槽游戏会自动跳过。

## 不要做的事

- 不要改 `assets/manifest.json` 里的 `file` 路径或插槽名。如果需要新增或改名插槽，改 `script/chapters/*.md` 里的素材提示行或 `tools/asset_meta.py`，再运行 `tools/build.py` 重新生成清单。
- 不要手改 `index.html`、`assets/README.md`、`assets/manifest.json`，它们都是生成文件。
- 不要改剧情文本，除非任务明确要求。

## 验证

```bash
python3 tools/build.py            # 构建；有剧本问题会打印"警告"
node tools/explore_hua.js         # 需要 playwright：逐话走遍所有选项，应报告 0 个运行报错、全部结局可达
```

用浏览器打开 `index.html` 即可试玩，素材放好后会立刻显示。
