import { writeFile } from 'node:fs/promises';

const OUTPUT_FILE = 'data.js';

const row1 = new Set(['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']);
const row2 = new Set(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l']);
const row3 = new Set(['z', 'x', 'c', 'v', 'b', 'n', 'm']);

function matchRowRule(p) {
    let r1 = 0, r2 = 0, r3 = 0;
    for (const c of p) {
        if (row1.has(c)) { r1++; continue; }
        if (row2.has(c)) { r2++; continue; }
        if (row3.has(c)) { r3++; }
    }
    return r1 === 2 && r2 === 2 && r3 === 2;
}

function stripTone(p) {
    return p.replace(/[āáǎà]/gi, 'a')
            .replace(/[ēéěè]/gi, 'e')
            .replace(/[īíǐì]/gi, 'i')
            .replace(/[ōóǒò]/gi, 'o')
            .replace(/[ūúǔù]/gi, 'u')
            .replace(/[üǖǘǚǜ]/gi, 'u');
}

async function loadPinyinData() {
    const url = 'https://unpkg.com/pinyin-data@1.0.0/%E5%85%A8%E6%8B%BC%E6%95%B0%E6%8D%AE.js';
    const response = await fetch(url);
    if (!response.ok) throw new Error(`pinyin fetch failed: ${response.status}`);
    const text = await response.text();
    const fn = new Function('module', 'exports', text);
    const m = { exports: {} };
    fn(m, m.exports);
    return { toneDict: m.exports['带音调拼音'], polyphonic: m.exports['多音字词表'] };
}

async function fetchEnglishWords() {
    const ENGLISH_SOURCE = 'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt';
    const response = await fetch(ENGLISH_SOURCE);
    if (!response.ok) throw new Error(`English words fetch failed: ${response.status}`);
    const text = await response.text();
    return text
        .split(/\r?\n/)
        .map(w => w.trim().toLowerCase())
        .filter(w => /^[a-z]{6}$/.test(w))
        .filter(matchRowRule);
}

function lookupPinyin(word, toneDict, polyphonic) {
    if (polyphonic[word]) {
        return stripTone(polyphonic[word].split(',')[0]);
    }
    let result = '';
    for (const ch of word) {
        const entry = toneDict[ch];
        if (!entry) return null;
        result += stripTone(entry.split(',')[0]);
    }
    return result;
}

function pinyinOf(word, toneDict, polyphonic) {
    const py = lookupPinyin(word, toneDict, polyphonic);
    if (!py || py.length !== 6) return null;
    if (!matchRowRule(py)) return null;
    return py;
}

async function main() {
    console.log('Loading pinyin dictionary from unpkg...');
    const { toneDict, polyphonic } = await loadPinyinData();
    console.log(`Loaded: ${Object.keys(toneDict).length} tone entries, ${Object.keys(polyphonic).length} polyphonic`);

    console.log('Fetching English words...');
    const englishWords = await fetchEnglishWords();
    console.log(`English valid: ${englishWords.length}`);

    // Curated list of ~400 common Chinese 2-character words
    // Each has been pre-verified (or is verified by the script below)
    // Format: [word, expected_pinyin_if_known]
    const candidateWords = [
        '安全','方案','模块','设备','创建','更新','删除','搜索','输出','格式',
        '配置','部署','服务','客户','组件','按钮','动作','方法','对象','编码',
        '设计','系统','模式','开发','测试','文档','数据','接口','协议','缓存',
        '日志','错误','异常','调试','构建','编译','运行','启动','停止','重启',
        '状态','版本','分支','合并','提交','拉取','推送','仓库','克隆','迁移',
        '备份','恢复','导入','导出','安装','卸载','升级','回滚','监控','报警',
        '流量','带宽','负载','集群','节点','网络','路由','网关','代理','隧道',
        '加密','解密','签名','证书','权限','角色','用户','登录','注册','注销',
        '密码','验证','激活','锁定','解锁','会话','令牌','票据','授权','凭证',
        '隐私','审计','合规','策略','规则','过滤','名单','风控','欺诈','漏洞',
        '补丁','病毒','木马','后门','爬虫','注入','跨站','脚本','跟踪','分析',
        '报表','统计','告警','预警','通知','消息','队列','主题','订阅','发布',
        '消费','生产','事务','连接','池化','线程','进程','协程','并行','并发',
        '同步','异步','阻塞','缓冲','缓存','预热','刷新','过期','持久','快照',
        '镜像','容器','编排','弹性','伸缩','扩缩','自愈','滚动','蓝绿','金丝',
        '灰度','重试','超时','限流','熔断','降级','隔离','分片','副本','均衡',
        '调度','分配','回收','抢占','公平','资源','配额','计量','计费','账单',
        '结算','充值','提现','转账','支付','收款','订单','交易','退款','售后',
        '评价','收藏','购物','优惠','折扣','促销','秒杀','团购','预售','赔付',
        '赔偿','免责','条款','协议','公示','备案','认证','年检','审核','通过',
        '驳回','申诉','复议','公证','签发','核验','委托','挂失','补办','变更',
        '转移','过户','注销','吊销','撤销','作废','遗失','盗用','冒用','借用',
        '租用','归还','收回','征用','调用','引用','克隆','复制','剪切','粘贴',
        '撤销','重做','保存','另存','打开','关闭','新建','编辑','修改','移动',
        '重命名','查找','替换','格式化','压缩','解压','打包','上传','下载',
        '同步','导入','导出','打印','预览','缩放','全屏','退出','帮助','关于',
        '设置','偏好','主题','皮肤','语言','时区','账号','提醒','日程','任务',
        '计划','备忘','便签','笔记','表格','演示','幻灯','白板','思维','流程',
        '架构','原型','交互','体验','可用','易用','美观','配色','布局','网格',
        '栅格','响应','适配','兼容','单元','集成','端到端','冒烟','回归','压测',
        '性能','压力','稳定','可靠','容灾','扩容','缩容','修复','优化','重构',
        '重写','拆分','解耦','耦合','内聚','单一','开闭','依赖','倒置','抽象',
        '实现','继承','多态','封装','重载','覆盖','接口','构造','析构','拷贝',
        '移动','指针','数组','链表','栈','队列','树','图','堆','哈希','集合',
        '映射','迭代','遍历','查找','排序','筛选','过滤','聚合','分组','联结',
        '提交','回滚','隔离','一致','原子','索引','主键','外键','约束','视图',
        '触发','存储','过程','函数','游标','锁','协程','回调','观察者','发布订阅',
        '单例','工厂','建造者','原型','代理','装饰','适配器','桥接','组合','享元',
        '门面','中介','命令','责任链','状态','策略','备忘录','访问者','解释器','装饰器',
    ];

    const seen = new Set();
    const chineseFiltered = [];

    for (const word of candidateWords) {
        if (seen.has(word)) continue;
        seen.add(word);
        const py = pinyinOf(word, toneDict, polyphonic);
        if (py) {
            chineseFiltered.push({ word, pinyin: py });
        }
    }

    console.log(`Chinese valid (2-2-2): ${chineseFiltered.length}`);
    if (chineseFiltered.length > 0) {
        console.log('Chinese samples:', chineseFiltered.slice(0, 8).map(c => `${c.word}|${c.pinyin}`).join(', '));
    }

    const enLines = englishWords.map(w => `    '${w}'`);
    const zhLines = chineseFiltered.map(c => `    '${c.word}|${c.pinyin}'`);
    const output = `const wordList = [\n${[...enLines, ...zhLines].join(',\n')}\n];\n`;

    await writeFile(OUTPUT_FILE, output, 'utf8');
    console.log(`\nTotal: ${englishWords.length} EN + ${chineseFiltered.length} ZH = ${englishWords.length + chineseFiltered.length}`);
    console.log(`Written: ${OUTPUT_FILE}`);
}

main().catch(err => {
    console.error(err.message);
    process.exitCode = 1;
});
