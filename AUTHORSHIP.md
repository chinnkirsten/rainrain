# 作者身份 / Authorship

Rainrain 以笔名 **Kirsten Chin** 发布。

为了让真实作者**日后能证明作者身份、但现在不暴露真实身份**，本仓库提交了一段
「加盐身份声明」的 SHA-256 哈希作为承诺（cryptographic commitment）：

    commitment = SHA-256( salt + "\n" + identity_statement )

**承诺哈希 / Committed hash：**

    ad881b09d7b6eb7624313f1529a42e60007cd9f295db90afa0e3f777992b4bf5

- `salt` 是 256 位随机数；`salt` 与 `identity_statement` 由作者私下保管，**不在本仓库内**。
- 因为加了随机盐，这段哈希**不泄露**任何身份信息。
- **将来如何验证：** 作者公布 `salt` 与 `identity_statement`，任何人用
  `printf '%s\n%s' '<salt>' '<identity_statement>' | shasum -a 256`
  重算，核对结果是否等于上面这串哈希即可。该哈希已随本次提交被 GitHub 打上时间戳。

Committed 2026-07-03.
