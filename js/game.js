// game.js: 游戏核心逻辑
// 负责管理游戏状态、主循环和玩家/AI数据

import { 
    BASE_HEALTH, 
    ENERGY_RATE, 
    ENERGY_LEVEL_BONUS, 
    // v25 S1: 导入新常量
    EXPERTISE_TRIGGER_TOTAL_LEVEL,
    EXPERTISE_TRIGGER_QTY_MIN_LEVEL,
    EXPERTISE_TRIGGER_DMG_MIN_LEVEL,
    EXPERTISE_TRIGGER_TAC_MIN_LEVEL,
    AETHER_COST_INCREASE,
    GAME_DURATION_SECONDS,
    AI_CLASS_NAMES
} from './constants.js';

export class Game {
    
    // 构造函数，用于接收 main.js 注入的依赖
    constructor(ctx, canvas, particleManager, uiManager, aiController) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.particleManager = particleManager;
        this.uiManager = uiManager;
        this.aiController = aiController;
        
        this.W = 0; // 画布宽度
        this.H = 0; // 画布高度
        this.gameLoopId = null;
        this.gameRunning = false;
        this.lastTime = 0;
        
        this.playerBaseEdge = 0;
        this.aiBaseEdge = 0;

        this.screenShake = { intensity: 0, duration: 0 };
        this.playerHitAlpha = 0;
        
        this.playerStats = {};
        this.aiStats = {};

        // 新增：用于拖尾特效的离屏画布
        this.trailCanvas = document.createElement('canvas');
        this.trailCtx = this.trailCanvas.getContext('2d');
    }

    // 辅助函数：获取状态 (用于传递给其他模块)
    getPlayerStats() { return this.playerStats; }
    getAiStats() { return this.aiStats; }
    getGameRunning() { return this.gameRunning; }
    getCanvasDimensions() { return { W: this.W, H: this.H, playerBaseEdge: this.playerBaseEdge, aiBaseEdge: this.aiBaseEdge }; }
    
    // --- 游戏状态管理 ---

    init() {
        this.resizeCanvas();
        this.particleManager.initParticlePool();
        this.gameRunning = false;
        
        this.playerStats = this.resetStats(true);
        this.aiStats = this.resetStats(false);
        
        // AI 随机职业
        const aiClasses = Object.keys(AI_CLASS_NAMES);
        const aiClass = aiClasses[Math.floor(Math.random() * aiClasses.length)];
        this.aiStats.class = aiClass;
        this.applyClassPassives(this.aiStats); // 应用 AI 被动
        
        this.particleManager.reset();
        this.screenShake = { intensity: 0, duration: 0 };
        this.playerHitAlpha = 0;

        this.uiManager.updateUI(); // 使用 UI 模块更新
        this.uiManager.showClassSelection(); // 使用 UI 模块显示弹窗
    }
    
    startGame(playerClass) {
        this.playerStats.class = playerClass;
        this.applyClassPassives(this.playerStats); // 应用玩家被动
        
        this.gameRunning = true;
        this.lastTime = performance.now();
        this.uiManager.hideModal(); // 使用 UI 模块隐藏弹窗
        
        if (this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
        this.gameLoop(this.lastTime);
    }

    gameOver(playerWon, customMessage = null) {
        if (!this.gameRunning) return;
        this.gameRunning = false;
        if (this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
        
        this.uiManager.showGameOver(playerWon, customMessage); // 使用 UI 模块
    }
    
    resizeCanvas() {
        this.W = this.canvas.width = window.innerWidth;
        this.H = this.canvas.height = window.innerHeight;

        // 同步更新拖尾画布的尺寸
        this.trailCanvas.width = this.W;
        this.trailCanvas.height = this.H;

        // UI 模块负责查询其元素的高度
        const uiHeights = this.uiManager.getUIBarHeights();
        this.aiBaseEdge = uiHeights.ai;
        this.playerBaseEdge = this.H - uiHeights.player;
    }

    // --- 数据初始化 ---

    resetStats(isPlayer) {
        return {
            energy: 100, health: BASE_HEALTH, 
            spawnRate: 0.2, power: 1, specialChance: 0,
            levelSpeed: 1, levelPower: 1, levelSpecial: 0,
            costSpeed: 75, costPower: 100, costSpecial: 150, 
            class: 'Commander',
            speedMod: 1.0, burnOnHit: 0,
            powerUpgradeMod: 1.0, speedUpgradeMod: 1.0, 
            costSpeedMultiplier: 1.4, costPowerMultiplier: 1.6, costTacticMultiplier: 1.8, 
            basicSpeedMod: 1.0, tacticPowerMod: 1.0, 
            expertiseQuantity: null, expertiseDamage: null, expertiseTactic: null,
            pendingExpertise: null,
            aether: 0, aetherCost: 100, 
            shield: 0, maxShield: 200, shieldTimer: 0, 
            skillActiveTimer_Berserker: 0,
            skillActiveTimer_Elementalist: 0,
            skillActiveTimer_Aegis: 0,
            // v25 P5: 虫群技能
            swarmSpawnBoostTimer: 0,
            
            // v25 BUG 修复: 为 Commander 和 Illusionist 添加冷却计时器
            skillActiveTimer_Commander: 0,
            skillActiveTimer_Illusionist: 0,
            
            gameTimer: GAME_DURATION_SECONDS
        };
    }
    
    applyClassPassives(stats) {
        // 重置被动
        stats.powerUpgradeMod = 1.0;
        stats.speedUpgradeMod = 1.0;
        stats.health = BASE_HEALTH;
        stats.speedMod = 1.0;
        
        // 应用职业被动
        if (stats.class === 'Berserker') {
            stats.powerUpgradeMod = 1.4; 
            stats.speedUpgradeMod = 0.7;
        } else if (stats.class === 'Swarm') {
            stats.powerUpgradeMod = 0.7;
            stats.speedUpgradeMod = 1.3;
        } else if (stats.class === 'Elementalist') {
            stats.costSpeedMultiplier *= 1.1;
            stats.costPowerMultiplier *= 1.1;
            stats.costTacticMultiplier *= 1.1;
        } else if (stats.class === 'Illusionist') {
            stats.costTacticMultiplier *= 1.1;
        } else if (stats.class === 'Aegis') {
            stats.health = BASE_HEALTH * 1.1; 
            stats.speedMod = 0.95; 
        }
    }

    // --- 玩家输入处理 ---

    playerUpgrade(type) {
        if (!this.gameRunning) return;
        
        let stats = this.playerStats;
        let checkExpertise = false;
        
        // v25 S1: 检查专精的通用函数
        const checkExpertiseTrigger = (pathType) => {
            const totalLevel = stats.levelSpeed + stats.levelPower + stats.levelSpecial;
            if (totalLevel < EXPERTISE_TRIGGER_TOTAL_LEVEL) return false;
            
            if (pathType === 'quantity' && stats.levelSpeed >= EXPERTISE_TRIGGER_QTY_MIN_LEVEL && !stats.expertiseQuantity) return true;
            if (pathType === 'damage' && stats.levelPower >= EXPERTISE_TRIGGER_DMG_MIN_LEVEL && !stats.expertiseDamage) return true;
            if (pathType === 'tactic' && stats.levelSpecial >= EXPERTISE_TRIGGER_TAC_MIN_LEVEL && !stats.expertiseTactic) return true;
            return false;
        };
        
        switch (type) {
            case 'quantity': 
                if (stats.energy >= stats.costSpeed) {
                    stats.energy -= stats.costSpeed;
                    stats.spawnRate += 0.1 * stats.speedUpgradeMod; 
                    stats.levelSpeed++;
                    stats.costSpeed = Math.floor(stats.costSpeed * stats.costSpeedMultiplier);
                    // v25 S1: 更新专精触发检查
                    if (checkExpertiseTrigger('quantity')) {
                        checkExpertise = true;
                        stats.pendingExpertise = 'quantity';
                    }
                }
                break;
            case 'damage': 
                 if (stats.energy >= stats.costPower) {
                    stats.energy -= stats.costPower;
                    let damageGain = 0.8 * stats.powerUpgradeMod;
                    // v25 S3: 移除 'Focus', 因为它被 'BurstIntent' 替换了
                    // if (stats.expertiseDamage === 'Focus') damageGain *= 1.2;
                    stats.power += damageGain; 
                    if (stats.class === 'Elementalist') {
                        stats.burnOnHit += 0.2; 
                    }
                    // v25 S3: 移除 'Nurture'
                    // if (stats.expertiseDamage === 'Nurture') { ... }
                    stats.levelPower++;
                    stats.costPower = Math.floor(stats.costPower * stats.costPowerMultiplier);
                    // v25 S1: 更新专精触发检查
                    if (checkExpertiseTrigger('damage')) {
                        checkExpertise = true;
                        stats.pendingExpertise = 'damage';
                    }
                }
                break;
            case 'tactic': 
                 if (stats.energy >= stats.costSpecial) {
                    stats.energy -= stats.costSpecial;
                    stats.specialChance = Math.min(0.5, stats.specialChance + 0.03);
                    // v25 S3: 移除 'Synergy', 替换为 'SkillSummons'
                    // if (stats.expertiseTactic === 'Synergy') { ... }
                    stats.levelSpecial++;
                    stats.costSpecial = Math.floor(stats.costSpecial * stats.costTacticMultiplier);
                    // v25 S1: 更新专精触发检查
                    if (checkExpertiseTrigger('tactic')) {
                        checkExpertise = true;
                        stats.pendingExpertise = 'tactic';
                    }
                }
                break;
        }
        
        // v25 S1: 即使升级的不是专精路径，也要检查是否达到了触发条件
        // 例如: 数量LV.4, 伤害LV.3, 战术LV.2 (总9)
        // 玩家升级伤害到LV.4 (总10) -> 此时应触发 "数量" 专精
        if (!checkExpertise && !stats.pendingExpertise) {
             if (checkExpertiseTrigger('quantity')) {
                 checkExpertise = true;
                 stats.pendingExpertise = 'quantity';
             } else if (checkExpertiseTrigger('damage')) {
                 checkExpertise = true;
                 stats.pendingExpertise = 'damage';
             } else if (checkExpertiseTrigger('tactic')) {
                 checkExpertise = true;
                 stats.pendingExpertise = 'tactic';
             }
        }
        
        if (checkExpertise) {
            this.triggerExpertiseChoice(stats.pendingExpertise);
        }
        
        this.uiManager.updateUI(); // 升级后更新UI
    }
    
    triggerExpertiseChoice(path) {
        this.gameRunning = false; // 暂停游戏
        this.uiManager.showExpertiseModal(path, this.playerStats); // UI模块负责显示
    }
    
    selectExpertise(choice) {
        const path = this.playerStats.pendingExpertise;
        
        // v25 S3: 更新专精效果
        if (path === 'quantity') {
            this.playerStats.expertiseQuantity = choice;
            if (choice === 'Vanguard') {
                this.playerStats.basicSpeedMod = 1.2;
            }
            // 'DualHatch' 效果在 particleManager.spawnParticles 中实现
        } 
        else if (path === 'damage') {
            this.playerStats.expertiseDamage = choice;
            // 'BurstIntent' 和 'BlastImpact' 效果在 particleManager 中实现
        }
        else if (path === 'tactic') {
            this.playerStats.expertiseTactic = choice;
            if (choice === 'Legend') {
                let legendMod = (this.playerStats.class === 'Commander') ? 1.45 : 1.25;
                this.playerStats.tacticPowerMod = legendMod;
            }
            // 'SkillSummons' 效果在 activateSkill 中实现
        }
        
        this.playerStats.pendingExpertise = null;
        this.uiManager.hideExpertiseModal(); // UI模块负责隐藏
        
        // 恢复游戏
        this.gameRunning = true;
        this.lastTime = performance.now();
        if (this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
        this.gameLoop(this.lastTime);
    }
    
    playerActivateSkill() {
        const stats = this.playerStats;
        const skillOnCooldown = stats.skillActiveTimer_Berserker > 0 || stats.skillActiveTimer_Elementalist > 0 || stats.skillActiveTimer_Aegis > 0;
        if (!this.gameRunning || stats.aether < stats.aetherCost || skillOnCooldown) return;
        
        stats.aether -= stats.aetherCost;
        stats.aetherCost += AETHER_COST_INCREASE; 
        
        this.activateSkill(stats, true);
        this.uiManager.updateUI();
    }
    
    // (aiController 也会调用这个)
    activateSkill(stats, isPlayer) {
        switch(stats.class) {
            case 'Commander':
                stats.shield = stats.maxShield;
                stats.shieldTimer = 10.0; 
                // v25 BUG 修复: 启动冷却
                stats.skillActiveTimer_Commander = 10.0; 
                break;
            case 'Berserker':
                stats.skillActiveTimer_Berserker = 5.0;
                break;
            // v25 P5: 虫群技能重做
            case 'Swarm':
                this.particleManager.spawnSwarm(isPlayer, 20); // 立即召唤20个
                stats.swarmSpawnBoostTimer = 3.0; // 开启 3 秒爆发产卵
                break;
            case 'Elementalist':
                stats.skillActiveTimer_Elementalist = 5.0; 
                break;
            case 'Illusionist':
                this.particleManager.triggerPhaseShift(isPlayer);
                // v25 BUG 修复: 启动冷却 (设置一个合理的8秒冷却)
                stats.skillActiveTimer_Illusionist = 8.0; 
                break;
            case 'Aegis':
                stats.skillActiveTimer_Aegis = 8.0; 
                break;
        }
        
        // v25 S3: 技能召唤
        if (stats.expertiseTactic === 'SkillSummons') {
            this.particleManager.spawnTacticUnit(isPlayer, 1);
        }
    }


    // --- 游戏主循环 ---

    gameLoop(now) {
        if (!this.gameRunning) {
            this.gameLoopId = requestAnimationFrame((t) => this.gameLoop(t));
            return;
        }

        let delta = (now - this.lastTime) / 1000;
        if (delta > 0.5) {
            delta = 1/60; 
            this.lastTime = now - delta * 1000;
        }
        this.lastTime = now;

        // 1. 更新计时器
        this.playerStats.gameTimer -= delta;
        if (this.playerStats.gameTimer <= 0) {
            const playerHealth = this.playerStats.health;
            const aiHealth = this.aiStats.health;
            if (playerHealth > aiHealth) this.gameOver(true, "时间到！你的基地更坚固！");
            else if (aiHealth > playerHealth) this.gameOver(false, "时间到！敌人的基地更坚固！");
            else this.gameOver(null, "时间到！平局！");
            return;
        }
        
        this.updateTimers(delta);

        // 2. 逻辑更新
        const totalPlayerLevel = this.playerStats.levelSpeed + this.playerStats.levelPower + this.playerStats.levelSpecial;
        this.playerStats.energy += ENERGY_RATE * (0.9 + totalPlayerLevel * ENERGY_LEVEL_BONUS) * delta; 
        
        // v25 BUG 修复: AI 能量没有增长
        const totalAILevel = this.aiStats.levelSpeed + this.aiStats.levelPower + this.aiStats.levelSpecial;
        this.aiStats.energy += ENERGY_RATE * (0.9 + totalAILevel * ENERGY_LEVEL_BONUS) * delta;

        this.aiController.updateAI(delta); // AI 模块
        this.particleManager.spawnParticles(delta); // 粒子模块
        this.particleManager.updateActiveParticles(delta); // 粒子模块
        this.particleManager.updateCollisions(); // 粒子模块
        
        // 技能效果 (如风暴, 光环)
        this.particleManager.applySkillEffects(delta);

        // 3. 绘制
        this.draw(); // 绘制所有内容

        // 4. 更新UI
        this.uiManager.updateUI();

        // 5. 请求下一帧
        this.gameLoopId = requestAnimationFrame((t) => this.gameLoop(t));
    }
    
    updateTimers(delta) {
        // 更新屏幕震动和受击提示
        if (this.screenShake.duration > 0) this.screenShake.duration -= delta;
        else this.screenShake.intensity = 0;
        
        if (this.playerHitAlpha > 0) this.playerHitAlpha = Math.max(0, this.playerHitAlpha - delta * 2.0);

        // 技能CD
        if (this.playerStats.skillActiveTimer_Berserker > 0) this.playerStats.skillActiveTimer_Berserker -= delta;
        if (this.aiStats.skillActiveTimer_Berserker > 0) this.aiStats.skillActiveTimer_Berserker -= delta;
        if (this.playerStats.skillActiveTimer_Elementalist > 0) this.playerStats.skillActiveTimer_Elementalist -= delta;
        if (this.aiStats.skillActiveTimer_Elementalist > 0) this.aiStats.skillActiveTimer_Elementalist -= delta;
        if (this.playerStats.skillActiveTimer_Aegis > 0) this.playerStats.skillActiveTimer_Aegis -= delta;
        if (this.aiStats.skillActiveTimer_Aegis > 0) this.aiStats.skillActiveTimer_Aegis -= delta;
        
        // v25 BUG 修复: 更新新添加的计时器
        if (this.playerStats.skillActiveTimer_Commander > 0) this.playerStats.skillActiveTimer_Commander -= delta;
        if (this.aiStats.skillActiveTimer_Commander > 0) this.aiStats.skillActiveTimer_Commander -= delta;
        if (this.playerStats.skillActiveTimer_Illusionist > 0) this.playerStats.skillActiveTimer_Illusionist -= delta;
        if (this.aiStats.skillActiveTimer_Illusionist > 0) this.aiStats.skillActiveTimer_Illusionist -= delta;

        // v25 P5: 虫群技能计时器
        if (this.playerStats.swarmSpawnBoostTimer > 0) this.playerStats.swarmSpawnBoostTimer -= delta;
        if (this.aiStats.swarmSpawnBoostTimer > 0) this.aiStats.swarmSpawnBoostTimer -= delta;
        
        // 护盾
        if (this.playerStats.shieldTimer > 0) {
            this.playerStats.shieldTimer -= delta;
            if (this.playerStats.shieldTimer <= 0) {
                this.playerStats.shield = 0;
                if (this.playerStats.class === 'Commander') this.particleManager.triggerSlowWave(true);
            }
        }
        if (this.aiStats.shieldTimer > 0) {
            this.aiStats.shieldTimer -= delta;
            if (this.aiStats.shieldTimer <= 0) {
                this.aiStats.shield = 0;
                if (this.aiStats.class === 'Commander') this.particleManager.triggerSlowWave(false);
            }
        }
    }
    
    // --- 绘制 ---
    
    draw() {
        const ctx = this.ctx;

        // 1. 让拖尾画布上的旧轨迹变淡
        this.trailCtx.save();
        this.trailCtx.globalCompositeOperation = 'destination-out';
        this.trailCtx.fillStyle = 'rgba(0, 0, 0, 0.05)'; // 透明度决定了拖尾的长短
        this.trailCtx.fillRect(0, 0, this.W, this.H);
        this.trailCtx.restore();
        
        ctx.save(); 
        if (this.screenShake.intensity > 0) {
            const dx = (Math.random() - 0.5) * 2 * this.screenShake.intensity;
            const dy = (Math.random() - 0.5) * 2 * this.screenShake.intensity;
            ctx.translate(dx, dy);
        }
        
        // 2. 绘制固定的背景色
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, this.W, this.H);

        // 3. 将拖尾画布绘制到主画布上
        ctx.drawImage(this.trailCanvas, 0, 0);
        
        // 4. 绘制所有其他特效和粒子（并将拖尾画布的 context 传进去）
        this.particleManager.drawEffects(ctx, this.playerHitAlpha, this.trailCtx);
        
        ctx.restore(); // 恢复画布状态 (清除震动)
        
        // 绘制玩家受击提示 (红色光晕)
        if (this.playerHitAlpha > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${this.playerHitAlpha * 0.2})`;
            ctx.fillRect(0, 0, this.W, this.H);
        }
    }
}