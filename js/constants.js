// 这个文件至关重要！
// 所有用于游戏平衡的“魔法数字”都应该放在这里。
// 当你想调整游戏平衡时，你只需要修改这一个文件。

export const BASE_HEALTH = 1000;
export const MAX_PARTICLES = 3000;
export const CELL_SIZE = 25; // 碰撞网格大小

// 经济
export const ENERGY_RATE = 30;
export const ENERGY_LEVEL_BONUS = 0.08;
export const AETHER_COST_INCREASE = 25;
export const AETHER_BANK_CAP_MULTIPLIER = 1.5;

// v25 方案 S1: 专精触发等级
export const EXPERTISE_TRIGGER_TOTAL_LEVEL = 10; // 总等级
export const EXPERTISE_TRIGGER_QTY_MIN_LEVEL = 4; // 路径I最低等级
export const EXPERTISE_TRIGGER_DMG_MIN_LEVEL = 4; // 路径II最低等级
export const EXPERTISE_TRIGGER_TAC_MIN_LEVEL = 3; // 路径III最低等级

// 游戏计时
export const GAME_DURATION_SECONDS = 300; // 5 分钟

// 职业名称 (用于UI显示)
export const AI_CLASS_NAMES = { 
    'Commander': '统帅', 
    'Berserker': '狂战士', 
    'Swarm': '虫群',
    'Elementalist': '元素使',
    'Illusionist': '幻术师',
    'Aegis': '圣盾'
};
// 复制一份给玩家，或者你可以只用一个
export const PLAYER_CLASS_NAMES = { ...AI_CLASS_NAMES };


// v25 方案 S3: 专精数据重做
export const expertiseData = {
    quantity: {
        title: "专精：路径 I (总 LV.10)",
        choices: {
            'Vanguard': { name: "「先锋」", desc: "你的所有基础单位（非战术单位）获得 +20% 移动速度。" },
            'DualHatch': { name: "「双重孵化」", desc: "你的基地从两个不同的随机点产生单位，使兵线更宽。" }
        }
    },
    damage: {
        title: "专精：路径 II (总 LV.10)",
        choices: {
            // v25 方案 S2
            'BurstIntent': { name: "「爆发战意」", desc: "你的所有单位在生成后的 2.5 秒内，攻击力获得 +50%。" },
            'BlastImpact': { name: "「爆破冲击」", desc: "你的所有单位在攻击时会造成小范围的溅射伤害（伤害的 10%）。" }
        }
    },
    tactic: {
        title: "专精：路径 III (总 LV.10)",
        choices: {
            'Legend': { name: "「传奇进化」", desc: "你的所有“战术单位”基础伤害和生命值额外+25%。" },
            'SkillSummons': { name: "「技能召唤」", desc: "每次你使用主动技能时，都会在你的基地免费召唤 1 个你当前的战术单位。" }
        }
    }
};

// 提示框数据 (Tooltip)
// v25 方案: P5 (虫群 Buff) + S3 (专精)
export const tooltipData = {
    'quantity': {
        desc: "提升你所有单位的产生速度。",
        bonus: "虫群职业: 额外 +30% 效果。",
        cost: "狂战士职业: -30% 效果。",
        expertise: {
            // v25 S3
            'Vanguard': "「先锋」: 基础单位移速 +20%",
            'DualHatch': "「双重孵化」: 基地从两个点产生单位"
        }
    },
    'damage': {
        desc: "提升你所有单位的伤害、体积和亮度。",
        bonus: "狂战士职业: 额外 +30% 效果。",
        cost: "虫群职业: -30% 效果。",
        expertise: {
            // v25 S3
            'BurstIntent': "「爆发战意」: 单位生成 2.5 秒内攻击力 +50%",
            'BlastImpact': "「爆破冲击」: 单位攻击造成 10% 溅射伤害"
        }
    },
    'tactic': {
        desc: {
            'Commander': "提升你 [守护巨兽] 的出现几率。\n特性: 死亡时分裂成 3 个老兵单位。",
            'Berserker': "提升你 [自爆巨兽] 的出现几率。\n特性: 死亡时对周围敌人造成范围伤害。",
            // v25 P5
            'Swarm': "提升你 [孵化领主] 的出现几率。\n特性: 在前进时孵化幼虫 (25% 攻击力)。",
            'Elementalist': "提升你 [熔火核心] 的出现几率。\n特性: 死亡时爆炸，施加范围燃烧。",
            // v25 S4
            'Illusionist': "提升你 [幻影刺客] 的出现几率。\n特性: 登场 3 秒内造成 2.0x 伤害。",
            'Aegis': "提升你 [圣骑士] 的出现几率。\n特性: 死亡时释放一个小型治疗脉冲。"
        },
        expertise: {
            // v25 S3
            'Legend': "「传奇进化」: 战术单位属性 +25%",
            'SkillSummons': "「技能召唤」: 使用技能时召唤 1 个战术单位"
        }
    },
    'skill': {
        'Commander': `[战术护盾]\n为基地提供 200 点护盾，持续 10 秒。护盾破裂时释放减速波。`,
        'Berserker': `[过载]\n在 5 秒内，所有新单位获得双倍伤害(反噬 8%)。`,
        // v25 P5
        'Swarm': `[紧急增援]\n立即召唤 30 个基础单位。并使你接下来 3 秒的基础单位产卵率提高至 150%。`,
        'Elementalist': `[烈焰风暴]\n在战场中部召唤 5 秒的火焰风暴，对穿过的所有单位(敌我)施加燃烧。`,
        // v25 S4
        'Illusionist': `[相位迁跃]\n传送 15 个后排单位。单位沿原方向[无敌]冲刺 0.2 秒 (5x 速度)。撞击护盾/单位造成 1.0x 伤害 + 0.3x 爆炸；撞击基地造成 1.3x 伤害 + 0.3x 爆炸。召唤 3 个幻影守卫。`,
        'Aegis': `[奉献]\n在基地创造 8 秒光环，使友军减伤 30%并缓慢治疗。代价: 期间所有以太获取 -50%。`
    }
};

// 技能效果相关
export const STORM_Y_START = 0.3;
export const STORM_Y_END = 0.5;