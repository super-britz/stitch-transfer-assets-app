import { deliveryItems, homeworkChecklist } from '../../lib/constants'

export function HomeworkOverview() {
  return (
    <section className="hidden lg:block">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.36em] text-primary">
        Web3 Homework
      </p>
      <h1 className="max-w-xl font-headline text-5xl font-extrabold leading-[0.95] text-white">
        用 Stitch UI 跑通老师布置的最小 Web3 前端作业。
      </h1>
      <p className="mt-5 max-w-lg text-base leading-7 text-on-surface-variant">
        这个页面直接对应你 Obsidian 笔记里的作业：准备两个钱包、领取测试网资产、做一个最小
        页面，并完成一笔 Sepolia ETH 转账和一笔 Solana Devnet 转账。
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <article className="rounded-3xl border border-white/6 bg-white/[0.03] p-5 shadow-soft">
          <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">作业清单</p>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-on-surface-variant">
            {homeworkChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="rounded-3xl border border-white/6 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-5 shadow-soft">
          <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">提交物</p>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-on-surface-variant">
            {deliveryItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-6 text-on-surface-variant">
            完成两笔测试网交易后，把交易链接、运行录屏和代码讲解放进你的作业说明里就可以了。
          </p>
        </article>
      </div>
    </section>
  )
}
