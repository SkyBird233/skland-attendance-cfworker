# skland-attendance-cfworker
Skland 自动签到（并推送到 Telegram），使用 Cloudflare Worker

# 使用
## 准备
1. 前往 skland.com 并登录
2. 访问 `https://web-api.skland.com/account/info/hg`
4. 记下 `"content": "YOUR_TOKEN"` 中 `YOUR_TOKEN` 对应位置的值
5. （可选）获取 Telegram bot token 和 chat id

## 部署
以下两种方式择一即可

### Cloudflare dashboard
1. 新建 worker
2. 复制 src/worker.js 所有内容并粘贴到 worker 中
3. 设置环境变量
	- `TOKEN`：上文 `YOUR_TOKEN` 的值
	- （可选）`TG_BOT_TOKEN`：Telegram bot token
	- （可选）`TG_CHAT_ID`：Telegram chat id
4. 设置 Cron Trigger

### Wrangler CLI
```sh
npx wrangler secret put TOKEN
npx wrangler secret put TG_BOT_TOKEN
npx wrangler secret put TG_CHAT_ID
npx wrangler deploy
```


# TODO
- [x] Simulate header according to https://gitee.com/FancyCabbage/skyland-auto-sign/tree/master#sign-header
- [ ] Multi token support
