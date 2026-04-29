# 我们的照片墙

一个用于纪念恋爱故事的静态照片墙网站，支持通过 GitHub Pages 发布。

## 功能

- **四季照片墙** — 春夏秋冬四个页面，每页可设置不同背景
- **照片拖动** — 自由拖放照片位置，支持旋转和调整大小
- **锁定位置** — 可将照片/文字框锁定防止误移动
- **六种相框** — 无边框、拍立得、古典、复古、心形、胶片
- **文字框** — 类似 PPT 的可拖动文字框，支持字体、字号、颜色
- **纪念日横幅** — 设定纪念日，到日期自动显示飘动横幅
- **数据持久化** — 所有布局保存在浏览器本地存储

## 目录结构

```
lifewall_web/
├── index.html          # 季节选择首页
├── wall.html           # 照片墙主页面
├── css/                # 样式文件
├── js/                 # JavaScript 模块
├── data/
│   └── config.json     # 纪念日和照片配置
└── assets/
    ├── backgrounds/    # 背景图片（spring/summer/autumn/winter）
    └── photos/         # 预置照片（spring/summer/autumn/winter）
```

## 使用说明

### 添加照片
1. 进入对应季节的照片墙
2. 点击顶部「**＋ 添加照片**」按钮
3. 点击「**上传新照片**」选择本地图片，或点击已有图片添加到墙上

### 更换背景
1. 点击顶部「**🖼 背景**」按钮
2. 选择一张图片作为当前季节的背景

### 设置相框
1. 点击选中一张照片
2. 右侧会自动弹出相框选择面板

### 添加文字
1. 点击「**＋ 文字**」按钮
2. 双击文字框开始编辑，可修改字体、颜色、大小

### 设置纪念日
1. 点击「**⚙️ 纪念日**」按钮
2. 添加日期、名称和备注
3. 到达设定日期时，页面顶部会出现飘动横幅

## 发布到 GitHub Pages

1. 在 GitHub 创建一个仓库（如 `lifewall`）
2. 将本项目推送到该仓库的 `main` 分支
3. 进入仓库 **Settings → Pages**
4. Source 选择 `main` 分支，目录选择 `/ (root)`
5. 保存后，网站地址为：`https://你的用户名.github.io/lifewall/`

```bash
git init
git add .
git commit -m "初始化照片墙"
git remote add origin https://github.com/你的用户名/lifewall.git
git push -u origin main
```

> **注意**：照片以 base64 格式存储在浏览器本地存储中，不会上传到 GitHub。
> 如需在多设备同步，可将照片放入 `assets/photos/` 文件夹并在 `data/config.json` 中配置路径。
