## 许可与署名（clone 前必查）

```bash
SSL_CERT_FILE=/etc/ssl/cert.pem gh api repos/<u>/<r> | jq '.license'  # + 找 LICENSE 文件 + 看 README
```

| 许可 | 能做什么 |
|---|---|
| MIT / Apache / BSD / Unlicense | 可改、可上线，保留致谢即可 |
| **NONE（无 LICENSE 文件 / 未声明）** | **默认保留所有权利**。仅本地学习/复刻，须署名原作者，**未经许可不得公开重新部署**。别因为代码公开就当成可自由用 |
| 专有 / 明确禁止 | 只读学习，不复制不部署 |

⚠️ 别把"GitHub 上是公开的"或"gh api 一时查不到"等同于 MIT——核实到底。
