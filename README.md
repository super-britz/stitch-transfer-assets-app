# Web3 作业转账页面

把 Stitch 风格的 `Transfer Assets` 移动端钱包设计做成一个真实可用的 Web3 作业应用。

覆盖一个最小的 Web3 前端工作流：

- 连接 EVM 钱包 → 切到 Sepolia → 发送测试 ETH
- 连接 Solana 钱包 → 使用 Devnet → 发送测试 SOL

## 功能

- Stitch 风格移动端转账 UI，React + Tailwind CSS 实现
- EVM 钱包支持 MetaMask、Rabby、OKX Wallet 及兼容的注入式钱包
- Solana 钱包支持 Phantom 及兼容的注入式钱包
- Sepolia 测试网 ETH 转账
- Solana Devnet SOL 转账
- 钱包状态自动刷新和最近交易链接
- 转账成功后表单自动重置

## 技术栈与依赖说明

### 运行时依赖

| 包名 | 作用 |
|------|------|
| `react` / `react-dom` | UI 框架，负责页面渲染和组件状态管理 |
| `viem` | EVM 链交互库——连接钱包、发送 ETH、查询余额、等待交易确认。类型安全，tree-shaking 友好，是 ethers.js 的现代替代 |
| `@solana/kit` | Solana 官方新一代 SDK（原 @solana/web3.js v2）——RPC 调用、地址工具、交易构建与编码。不再需要 Node.js polyfill，原生支持浏览器 |
| `@solana-program/system` | Solana System Program 指令库，提供 `getTransferSolInstruction` 用于构建 SOL 转账指令 |
| `lucide-react` | 图标库，提供转账页面中的箭头、钱包、设置等 SVG 图标 |

### 开发依赖

| 包名 | 作用 |
|------|------|
| `vite` | 构建工具，提供开发服务器和生产打包 |
| `@vitejs/plugin-react` | Vite 的 React 插件，支持 JSX 转换和热更新 |
| `tailwindcss` / `@tailwindcss/vite` | CSS 工具类框架及其 Vite 插件，用于快速编写样式 |
| `typescript` | 类型系统，提供静态类型检查 |
| `@types/react` / `@types/react-dom` / `@types/node` | React 和 Node.js 的 TypeScript 类型定义 |
| `eslint` / `@eslint/js` / `typescript-eslint` | 代码检查工具链 |
| `eslint-plugin-react-hooks` | 检查 React Hooks 使用是否符合规则 |
| `eslint-plugin-react-refresh` | 确保组件导出方式兼容 Vite 的热更新 |
| `globals` | 为 ESLint 提供全局变量定义（如 `window`、`document`） |

## 快速开始

```bash
nvm use 22
npm install
npm run dev
```

或用 `fnm`：

```bash
fnm use 22.22.0
npm install
npm run dev
```

## 作业对应关系

这个应用直接对应一个 Web3 作业，要求：

- 准备两个钱包（EVM + Solana）
- 从水龙头领取测试币
- 做一个包含按钮和输入框的页面
- 完成一次 ETH 转账和一次 SOL 转账

本仓库覆盖了页面和转账逻辑。你还需要：

1. 准备自己的 EVM 钱包和 Solana 钱包
2. 从水龙头领取 Sepolia ETH 和 Devnet SOL
3. 用自己的账户完成两笔转账
4. 记录交易链接用于提交

## 提交建议

- 代码仓库链接
- 部署后的项目链接
- 简短代码讲解
- Sepolia 交易链接
- Solana Devnet 交易链接

## 注意事项

- 所有操作仅限测试网使用
- 应用依赖浏览器注入式钱包扩展
- 构建时的 chunk size 警告来自 Web3 SDK 体积，不影响使用
