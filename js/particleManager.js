// particleManager.js: 管理所有粒子
// 负责: 对象池、生成、碰撞、绘制

import { Particle } from './particle.js';
// v25 BUG 修复: 重新导入 MAX_PARTICLES
import { MAX_PARTICLES, CELL_SIZE, AETHER_BANK_CAP_MULTIPLIER, STORM_Y_START, STORM_Y_END } from './constants.js';

export class ParticleManager {
    constructor() {
        this.game = null; // 将由 main.js 注入
        
        this.particlePool = [];
        this.activeParticles = [];
        this.activeHitEffects = [];
        // this.activeTeleportEffects = []; // v25 P2: 移除
        
        this.grid = new Map();
        
        this.playerSpawnAccumulator = 0;
        this.aiSpawnAccumulator = 0;
    }
    
    // 注入 game 实例，以便访问状态
    setGameInstance(gameInstance) {
        this.game = gameInstance;
    }
    
    reset() {
        this.activeParticles.length = 0;
        this.activeHitEffects.length = 0;
        // this.activeTeleportEffects.length = 0; // v25 P2: 移除
        this.playerSpawnAccumulator = 0;
        this.aiSpawnAccumulator = 0;
        for (const p of this.particlePool) p.reset();
    }
    
    // --- 对象池 ---
    
    initParticlePool() {
        this.particlePool.length = 0;
        for (let i = 0; i < MAX_PARTICLES; i++) {
            this.particlePool.push(new Particle());
        }
    }
    
    getParticleFromPool() {
        for (let i = 0; i < this.particlePool.length; i++) {
            if (!this.particlePool[i].active) return this.particlePool[i];
        }
        for (let i = 0; i < this.activeParticles.length; i++) {
            if (this.activeParticles[i].isEffect) {
                this.activeParticles[i].active = false;
                return this.activeParticles[i];
            }
        }
        return null; 
    }
    
    // --- 粒子更新与绘制 ---
    
    updateActiveParticles(delta) {
        // 从 game 模块获取当前状态
        const { W, H, playerBaseEdge, aiBaseEdge } = this.game.getCanvasDimensions();
        const playerStats = this.game.getPlayerStats();
        const aiStats = this.game.getAiStats();
        
        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const p = this.activeParticles[i];
            if (p.active) {
                // 将所有需要的状态传递给 update 方法
                p.update(delta, W, H, playerStats, aiStats, playerBaseEdge, aiBaseEdge, this);
                this.updateParticleVisuals(p); 
            }
            if (!p.active) {
                this.activeParticles.splice(i, 1);
            }
        }
    }
    
    drawEffects(ctx, playerHitAlpha, trailCtx) {
        const { W, H, playerBaseEdge, aiBaseEdge } = this.game.getCanvasDimensions();
        const playerStats = this.game.getPlayerStats();
        const aiStats = this.game.getAiStats();
        
        // (v25 S5 BUG修复: 移动端 delta 可能很大, 导致 effect.life < 0)
        // (我们使用固定的 1/60 来估算 delta，确保特效平滑)
        const delta = 1/60.0;

        // 绘制基地受击特效
        for (let i = this.activeHitEffects.length - 1; i >= 0; i--) {
             // ... (复制 draw 循环中的 activeHitEffects 绘制逻辑) ...
             const effect = this.activeHitEffects[i];
             const width = 24 + 20 * effect.intensity;
             const x_pos = effect.x - width / 2;
             const height = (30 + 70 * effect.intensity) * effect.life; 
             const y = effect.isPlayer ? playerBaseEdge : aiBaseEdge;
             const y_pos = effect.isPlayer ? y - height : y;
             
             let gradient;
             if (effect.isPlayer) {
                 gradient = ctx.createLinearGradient(0, y_pos, 0, y);
                 gradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
                 gradient.addColorStop(1, `rgba(255, 255, 255, ${effect.life * 0.8})`);
             } else {
                 gradient = ctx.createLinearGradient(0, y_pos, 0, y_pos + height);
                 gradient.addColorStop(0, `rgba(255, 255, 255, ${effect.life * 0.8})`);
                 gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
             }
             ctx.fillStyle = gradient;
             ctx.fillRect(x_pos, y_pos, width, height);
             
             effect.life -= delta * 3.0; 
             if (effect.life <= 0) this.activeHitEffects.splice(i, 1);
        }

        // 绘制风暴和光环
        if (playerStats.skillActiveTimer_Elementalist > 0 || aiStats.skillActiveTimer_Elementalist > 0) {
             const y_start = H * STORM_Y_START;
             const y_end = H * STORM_Y_END;
             ctx.fillStyle = `rgba(255, 100, 0, ${0.1 + Math.sin(performance.now()/200) * 0.1})`;
             ctx.fillRect(0, y_start, W, y_end - y_start);
        }
        if (playerStats.skillActiveTimer_Aegis > 0) {
             const auraY = playerBaseEdge;
             const auraRadius = H * 0.2;
             let gradient = ctx.createRadialGradient(W/2, auraY, auraRadius * 0.5, W/2, auraY, auraRadius);
             gradient.addColorStop(0, `rgba(255, 255, 200, ${0.1 + Math.sin(performance.now()/300) * 0.05})`);
             gradient.addColorStop(1, `rgba(255, 255, 200, 0)`);
             ctx.fillStyle = gradient;
             ctx.fillRect(0, auraY - auraRadius, W, auraRadius);
        }
        if (aiStats.skillActiveTimer_Aegis > 0) {
             const auraY = aiBaseEdge;
             const auraRadius = H * 0.2;
             let gradient = ctx.createRadialGradient(W/2, auraY, auraRadius * 0.5, W/2, auraY, auraRadius);
             gradient.addColorStop(0, `rgba(255, 255, 200, ${0.1 + Math.sin(performance.now()/300) * 0.05})`);
             gradient.addColorStop(1, `rgba(255, 255, 200, 0)`);
             ctx.fillStyle = gradient;
             ctx.fillRect(0, auraY, W, auraRadius);
        }

        // 绘制所有粒子 (并传入 trailCtx)
        for (const p of this.activeParticles) {
            p.draw(ctx, trailCtx);
        }
        
        // 绘制护盾
        if (playerStats.shieldTimer > 0) {
            const shieldAlpha = Math.min(1.0, playerStats.shield / 50.0);
            ctx.strokeStyle = `rgba(150, 200, 255, ${shieldAlpha * 0.5})`;
            ctx.fillStyle = `rgba(150, 200, 255, ${shieldAlpha * 0.2})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, playerBaseEdge);
            for (let x = 0; x <= W; x += 20) {
                const t = x / W;
                const shieldY = playerBaseEdge - 60 * t * (1 - t) * shieldAlpha;
                ctx.lineTo(x, shieldY);
            }
            ctx.lineTo(W, playerBaseEdge);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        if (aiStats.shieldTimer > 0) {
             const shieldAlpha = Math.min(1.0, aiStats.shield / 50.0);
             ctx.strokeStyle = `rgba(150, 200, 255, ${shieldAlpha * 0.5})`;
             ctx.fillStyle = `rgba(150, 200, 255, ${shieldAlpha * 0.2})`;
             ctx.lineWidth = 3;
             ctx.beginPath();
             ctx.moveTo(0, aiBaseEdge);
             for (let x = 0; x <= W; x += 20) {
                 const t = x / W;
                 const shieldY = aiBaseEdge + 60 * t * (1 - t) * shieldAlpha;
                 ctx.lineTo(x, shieldY);
             }
             ctx.lineTo(W, aiBaseEdge);
             ctx.closePath();
             ctx.fill();
             ctx.stroke();
         }
    }
    
    // v25 P2: 移除“旧”的拖尾绘制逻辑
    /*
    drawTeleportEffects(ctx) {
        // v25 P2: 拖尾逻辑已移至 particle.js (通过 spawnSpark)
        // activeTeleportEffects 数组不再使用
        
        // (原内容已删除)
    }
    */
    
    // --- 粒子生成 (Spawning) ---
    
    spawnParticles(delta) {
        const playerStats = this.game.getPlayerStats();
        const aiStats = this.game.getAiStats();
        const { W, H, playerBaseEdge, aiBaseEdge } = this.game.getCanvasDimensions();
        
        // v25 P5: 虫群爆发产卵
        let playerRate = playerStats.spawnRate;
        if (playerStats.swarmSpawnBoostTimer > 0) playerRate *= 1.5;
        this.playerSpawnAccumulator += playerRate * delta * (10 + playerStats.levelSpeed);
        
        let aiRate = aiStats.spawnRate;
        if (aiStats.swarmSpawnBoostTimer > 0) aiRate *= 1.5;
        this.aiSpawnAccumulator += aiRate * delta * (10 + aiStats.levelSpeed);

        while (this.playerSpawnAccumulator >= 1) {
            const p = this.getParticleFromPool();
            if (p) {
                // v25 S3: 双重孵化
                let x = Math.random() * W;
                if (playerStats.expertiseQuantity === 'DualHatch') {
                    x = (W * 0.25) + (Math.random() * (W * 0.5)); // 在 25% 到 75% 之间
                }
                const y = playerBaseEdge - 5 + (Math.random() * 5); 
                const isSpecial = Math.random() < playerStats.specialChance;
                
                let basePower = playerStats.power;
                if (playerStats.skillActiveTimer_Berserker > 0) basePower *= 2; 
                
                let tacticMod = playerStats.tacticPowerMod;
                if (isSpecial && playerStats.class === 'Commander') {
                    tacticMod *= 1.2; 
                }
                const power = isSpecial ? (basePower * 5 * tacticMod) : basePower;
                const tactic = isSpecial ? playerStats.class : 'Berserker';
                
                p.init(x, y, true, power, isSpecial, tactic, false, false, playerStats, H);
                if (playerStats.skillActiveTimer_Berserker > 0) p.isOverloaded = true;
                
                this.activeParticles.push(p);
            }
            this.playerSpawnAccumulator -= 1;
        }
        
        while (this.aiSpawnAccumulator >= 1) {
            const p = this.getParticleFromPool();
            if (p) {
                let x = Math.random() * W;
                if (aiStats.expertiseQuantity === 'DualHatch') {
                    x = (W * 0.25) + (Math.random() * (W * 0.5));
                }
                const y = aiBaseEdge + 5 - (Math.random() * 5);
                const isSpecial = Math.random() < aiStats.specialChance;

                let basePower = aiStats.power;
                if (aiStats.skillActiveTimer_Berserker > 0) basePower *= 2; 
                
                let tacticMod_ai = aiStats.tacticPowerMod;
                if (isSpecial && aiStats.class === 'Commander') {
                    tacticMod_ai *= 1.2; 
                }
                const power = isSpecial ? (basePower * 5 * tacticMod_ai) : basePower;
                const tactic = isSpecial ? aiStats.class : 'Berserker';

                p.init(x, y, false, power, isSpecial, tactic, false, false, aiStats, H);
                if (aiStats.skillActiveTimer_Berserker > 0) p.isOverloaded = true;

                this.activeParticles.push(p);
            }
            this.aiSpawnAccumulator -= 1;
        }
    }
    
    // v25 S3: 技能召唤战术单位
    spawnTacticUnit(isPlayer, count = 1) {
        const stats = isPlayer ? this.game.getPlayerStats() : this.game.getAiStats();
        const { W, H, playerBaseEdge, aiBaseEdge } = this.game.getCanvasDimensions();

        for (let i = 0; i < count; i++) {
            const p = this.getParticleFromPool();
            if (p) {
                const x = Math.random() * W;
                const y = isPlayer ? (playerBaseEdge - 5) : (aiBaseEdge + 5);
                
                let basePower = stats.power;
                let tacticMod = stats.tacticPowerMod;
                if (stats.class === 'Commander') tacticMod *= 1.2;
                
                const power = basePower * 5 * tacticMod;
                const tactic = stats.class;
                
                p.init(x, y, isPlayer, power, true, tactic, false, false, stats, H);
                this.activeParticles.push(p);
            }
        }
    }
    
    spawnSpark(x, y, hue, saturation, lightness, count = 3, isExplosion = false) {
        const trueCount = this.activeParticles.length > 800 ? Math.max(1, Math.floor(count / 3)) : count;
        for (let i = 0; i < trueCount; i++) {
            const p = this.getParticleFromPool();
            if (p) {
                p.initSpark(x + Math.random()*4-2, y + Math.random()*4-2, hue, saturation, lightness, isExplosion);
                this.activeParticles.push(p);
            }
        }
    }
    
    // v25 P5: 虫群技能 (签名修改)
    spawnSwarm(isPlayer, count = 20) {
        const stats = isPlayer ? this.game.getPlayerStats() : this.game.getAiStats();
        const { W, H, playerBaseEdge, aiBaseEdge } = this.game.getCanvasDimensions();
        
        for (let i = 0; i < count; i++) {
            const p = this.getParticleFromPool();
            if (p) {
                const x = Math.random() * W;
                const y = isPlayer ? (playerBaseEdge - 5 + (Math.random() * 5)) : (aiBaseEdge + 5 - (Math.random() * 5));
                p.init(x, y, isPlayer, stats.power, false, 'Berserker', false, false, stats, H);
                this.activeParticles.push(p);
            }
        }
        // v25 P5: 移除全局加速, 改为在 game.js 中设置 spawn boost timer
    }
    
    // v25 P5: 虫群幼虫 (伤害 Buff)
    spawnLarva(x, y, isPlayer, hostPower) {
        const stats = isPlayer ? this.game.getPlayerStats() : this.game.getAiStats();
        const { H } = this.game.getCanvasDimensions();
        const p = this.getParticleFromPool();
        if (p) {
            p.init(x, y, isPlayer, hostPower * 0.25, false, 'Berserker', true, false, stats, H); // 15% -> 25%
            this.activeParticles.push(p);
        }
    }
    
    // v25 S4/S5: 幻术师守卫 (从 v24 添加)
    spawnIllusionGuard(x, y, isPlayer) {
         const stats = isPlayer ? this.game.getPlayerStats() : this.game.getAiStats();
         const { H } = this.game.getCanvasDimensions();
         const p = this.getParticleFromPool();
         if (p) {
             p.init(x, y, isPlayer, 50, false, 'Illusionist', false, false, stats, H);
             p.isIllusionGuard = true;
             p.vy = 0; p.vx = 0;
             p.life = 5.0; // 5 seconds
             p.radius = 12; 
             p.hue = 270; 
             p.lightness = 70;
             this.activeParticles.push(p);
         }
    }
    
    // v25 S4: 幻术师技能
    triggerPhaseShift(isPlayer) {
        const stats = isPlayer ? this.game.getPlayerStats() : this.game.getAiStats();
        const { W, H, playerBaseEdge, aiBaseEdge } = this.game.getCanvasDimensions();
        
        const particlesToTeleport = this.activeParticles
            .filter(p => p.active && !p.isEffect && p.isPlayer === isPlayer && 
                   !p.isSpecial && !p.isLarva && !p.isVeteran && 
                   (isPlayer ? p.y > H * 0.6 : p.y < H * 0.4)) // 选取后 40% 的单位
            .sort((a, b) => isPlayer ? a.y - b.y : b.y - a.y) 
            .slice(0, 15); // 最多 15 个
        
        for (const p of particlesToTeleport) {
            // S4: 设置冲刺状态
            p.isPhased = true;
            p.boostTimer = 0.2; // 0.2 秒无敌冲刺
            p.vy *= 5.0; 
            p.vx *= 5.0; // 沿原方向
            
            // S4: 拖尾特效 (P2: 移除. 这段逻辑移到 particle.js 的 update() 和 draw() 中)
            // this.activeTeleportEffects.push({ ... });
        }
        
        // S4/S5: 召唤守卫
        const guardY = isPlayer ? playerBaseEdge - 30 : aiBaseEdge + 30;
        this.spawnIllusionGuard(W * 0.3, guardY, isPlayer);
        this.spawnIllusionGuard(W * 0.5, guardY, isPlayer);
        this.spawnIllusionGuard(W * 0.7, guardY, isPlayer);
    }
    
    // v25 S4: 幻术师撞击护盾
    triggerPhaseExplosionOnShield(targetIsPlayer, damage, x_coord, y_coord) {
         const shieldStats = targetIsPlayer ? this.game.getPlayerStats() : this.game.getAiStats();
         if (shieldStats.shieldTimer <= 0) return; 

         // S4: 1.0x 伤害
         const damageToShield = Math.min(shieldStats.shield, damage); 
         shieldStats.shield -= damageToShield;
         
         // S4: 0.3x 爆炸 (不伤基地)
         this.triggerExplosion(x_coord, y_coord, !targetIsPlayer, damage * 0.3, 'arcane', true); // 'true' = excludeBase

         if (shieldStats.shield <= 0) {
             shieldStats.shieldTimer = 0; 
             if (shieldStats.class === 'Commander') this.triggerSlowWave(targetIsPlayer); 
             shieldStats.shield = 0;
         }
         
         this.spawnSpark(x_coord, y_coord, 270, 100, 80, 3, true); 
    }
    
    // v25 S3: 溅射伤害
    triggerSplashDamage(x, y, isPlayer, damage, radius = 30) {
        for (const p of this.activeParticles) {
            if (!p.active || p.isEffect || p.isIllusionGuard || p.isPlayer === isPlayer) continue;
            
            const dx = p.x - x;
            const dy = p.y - y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < radius) {
                p.power -= damage;
                if (p.power <= 0 && p.active) { // 检查 p.active 避免重复触发
                    p.active = false;
                    this.spawnSpark(p.x, p.y, p.hue, p.saturation, p.lightness, 2);
                    // (此处可添加击杀奖励)
                }
            }
        }
    }
    
    // v25 S4: 爆炸 (增加 excludeBase 选项)
    triggerExplosion(x, y, isPlayer, damage, type = 'normal', excludeBase = false) {
        const stats = isPlayer ? this.game.getPlayerStats() : this.game.getAiStats();
        let explosionRadius = 70;
        let sparkCount = 8;
        let hue, sat, light;
        
        if (type === 'normal') {
            if (stats.class === 'Berserker') explosionRadius = 77;
            hue = 0; sat = 100; light = 70;
        } else if (type === 'burn') {
            hue = 30; sat = 100; light = 70;
            sparkCount = 6;
        } else if (type === 'arcane') {
            sparkCount = 4;
            hue = 270; sat = 100; light = 80;
        }
        
        this.spawnSpark(x, y, hue, sat, light, sparkCount, true);
        
        const p = this.getParticleFromPool();
        if (p) {
            p.initShockwave(x, y, hue, sat, light, explosionRadius);
            this.activeParticles.push(p);
        }

        // 伤害粒子
        for (const p of this.activeParticles) {
            if (!p.active || p.isEffect || p.isIllusionGuard || p.isPlayer === isPlayer) continue; 
            
            const dx = p.x - x;
            const dy = p.y - y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < explosionRadius) {
                if (type === 'burn' && !p.isEffect) {
                    p.burnTimer = 4.0;
                    p.burnDamage = damage * 0.5;
                } else {
                    p.power -= damage; 
                    if (p.power <= 0 && p.active) {
                        p.active = false;
                        this.spawnSpark(p.x, p.y, p.hue, p.saturation, p.lightness, 3);
                        // (以太奖励)
                    }
                }
            }
        }
        
        // v25 S4: 伤害基地 (除非被豁免)
        if (!excludeBase) {
            const { W, H, playerBaseEdge, aiBaseEdge } = this.game.getCanvasDimensions();
            const targetBaseEdge = isPlayer ? aiBaseEdge : playerBaseEdge;
            const targetIsPlayer = !isPlayer;
            
            if ((isPlayer && y < targetBaseEdge + explosionRadius) || 
                (!isPlayer && y > targetBaseEdge - explosionRadius)) 
            {
                 // 简单粗暴：如果爆炸中心在基地范围内，就造成伤害
                 // (未来可以优化为按距离衰减)
                 this.triggerBaseHitEffect(targetIsPlayer, damage * 0.5, x, true); // 造成 50% 伤害, silent
            }
        }
    }
    
    // (其他 trigger... 和 spawn... 方法)
    // (spawnVeterans, triggerAegisHeal, triggerSlowWave, triggerBaseHitEffect, triggerShieldHitEffect)
    // (这些方法从原文件复制过来，保持不变, 只需确保它们调用 this.game.get...Stats())
    
    spawnVeterans(x, y, isPlayer, count = 3) {
        const stats = isPlayer ? this.game.getPlayerStats() : this.game.getAiStats();
        const { H } = this.game.getCanvasDimensions();
        const tacticMod = (stats.class === 'Commander') ? (stats.tacticPowerMod * 1.2) : stats.tacticPowerMod;
        for (let i = 0; i < count; i++) {
            const p = this.getParticleFromPool();
            if (p) {
                const power = stats.power * 2 * tacticMod; 
                p.init(x, y, isPlayer, power, false, 'Berserker', false, true, stats, H); 
                if (i === 0) { p.vx = -1.5; p.vy *= 0.9; }
                else if (i === 1) { p.vx = 0; p.vy *= 1.1; }
                else { p.vx = 1.5; p.vy *= 0.9; }
                this.activeParticles.push(p);
            }
        }
    }

    triggerAegisHeal(x, y, isPlayer, healAmount) {
        const healRadius = 50;
        this.spawnSpark(x, y, 60, 100, 80, 5);
        for (const p of this.activeParticles) {
            if (!p.active || p.isEffect || p.isPlayer !== isPlayer) continue;
            const dx = p.x - x;
            const dy = p.y - y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < healRadius) {
                p.power = Math.min(p.initialPower, p.power + healAmount);
            }
        }
    }
    
    triggerSlowWave(isPlayer) {
        const opponentIsPlayer = !isPlayer;
        for (const p of this.activeParticles) {
            if (p.active && !p.isEffect && !p.isIllusionGuard && p.isPlayer === opponentIsPlayer) {
                // v25 P5: 修复虫群加速BUG
                // 只有在没有 boostTimer 时才减速
                if (p.boostTimer <= 0) {
                    p.vy /= 1.3; // 减速 30%
                    p.boostTimer = 1.5; // 持续 1.5 秒 (结束后恢复)
                }
            }
        }
    }

    triggerShieldHitEffect(isPlayerBase, damage, x_coord, y_coord) {
        const stats = isPlayerBase ? this.game.getPlayerStats() : this.game.getAiStats();
        
        stats.shield -= damage;
        
        if (stats.shield <= 0) {
            stats.shieldTimer = 0; 
            if (stats.class === 'Commander') this.triggerSlowWave(isPlayerBase);
            stats.shield = 0;
        }
        
        this.spawnSpark(x_coord, y_coord, 200, 50, 100, 2, false);
        
        let aetherGain = damage * 0.05;
        const attackerStats = isPlayerBase ? this.game.getAiStats() : this.game.getPlayerStats();
        const attackerCost = isPlayerBase ? this.game.getAiStats().aetherCost : this.game.getPlayerStats().aetherCost;
        
        if (isPlayerBase) { 
            if (this.game.getAiStats().skillActiveTimer_Aegis > 0) aetherGain *= 0.5;
        } else { 
            if (this.game.getPlayerStats().skillActiveTimer_Aegis > 0) aetherGain *= 0.5;
        }
        
        attackerStats.aether = Math.min(attackerCost * AETHER_BANK_CAP_MULTIPLIER, attackerStats.aether + aetherGain);
    }
    
    triggerBaseHitEffect(isPlayerBase, damage, x_coord, isSilent = false) {
        const stats = isPlayerBase ? this.game.getPlayerStats() : this.game.getAiStats();
        let damageToHealth = damage;
        
        if (stats.shieldTimer > 0 && stats.shield > 0) {
             const damageToShield = Math.min(stats.shield, damage);
             damageToHealth = damage - damageToShield;
             stats.shield -= damageToShield;
        }
        
        if (damageToHealth > 0 && stats.skillActiveTimer_Aegis > 0) {
             damageToHealth *= 0.7;
        }

        if (damageToHealth > 0) {
             stats.health -= damageToHealth;
             if (stats.health <= 0) {
                 if(isPlayerBase) this.game.gameOver(false); 
                 else this.game.gameOver(true); 
             }
        }
        
        if (isSilent) {
             if (isPlayerBase && damageToHealth > 0) this.game.playerHitAlpha = Math.min(1.0, this.game.playerHitAlpha + 0.2); 
             return;
        }
        
        const intensity = Math.min(damage / 40.0, 1.0);
         this.activeHitEffects.push({
             x: x_coord,
             isPlayer: isPlayerBase,
             life: 1.0,
             intensity: intensity
         });
         
         const sparkCount = Math.min(Math.floor(damage * 1.0), 8);
         const { playerBaseEdge, aiBaseEdge } = this.game.getCanvasDimensions();
         const y = isPlayerBase ? playerBaseEdge : aiBaseEdge;
         this.spawnSpark(x_coord, y, 0, 0, 100, sparkCount);

         if (isPlayerBase) {
             this.game.playerHitAlpha = Math.min(1.0, this.game.playerHitAlpha + intensity * 0.5);
         } else {
             const shakeIntensity = Math.min(damageToHealth, 10); 
             if (shakeIntensity > 0) {
                 this.game.screenShake.intensity = Math.max(this.game.screenShake.intensity, shakeIntensity);
                 this.game.screenShake.duration = 0.2; 
             }
             
             let aetherGain = damage * 0.15;
             const playerStats = this.game.getPlayerStats();
             if (playerStats.skillActiveTimer_Aegis > 0) aetherGain *= 0.5;
             playerStats.aether = Math.min(playerStats.aetherCost * AETHER_BANK_CAP_MULTIPLIER, playerStats.aether + aetherGain);
         }
    }

    
    // --- 技能效果 ---
    applySkillEffects(delta) {
        const { H } = this.game.getCanvasDimensions();
        const playerStats = this.game.getPlayerStats();
        const aiStats = this.game.getAiStats();
        
        // 元素使
        if (playerStats.skillActiveTimer_Elementalist > 0 || aiStats.skillActiveTimer_Elementalist > 0) {
            const stormActive = (playerStats.skillActiveTimer_Elementalist > 0 && aiStats.skillActiveTimer_Elementalist > 0);
            const pStats = stormActive ? playerStats : (playerStats.skillActiveTimer_Elementalist > 0 ? playerStats : aiStats);
            const aiStats_ = stormActive ? aiStats : (playerStats.skillActiveTimer_Elementalist > 0 ? playerStats : aiStats);
            
            for (const p of this.activeParticles) {
                 if (p.active && !p.isEffect && !p.isIllusionGuard && p.y > H * STORM_Y_START && p.y < H * STORM_Y_END) { 
                       p.burnTimer = 0.5; 
                       // v25 S3: 元素使被动现在在升级时增加 burnOnHit, 而不是技能
                       p.burnDamage = 5.0; 
                 }
             }
         }
         
         // 圣盾
         if (playerStats.skillActiveTimer_Aegis > 0) {
             const { playerBaseEdge } = this.game.getCanvasDimensions();
             const AURA_RANGE_Y = H * 0.2;
             const HEAL_AMOUNT = 0.5 * delta; 
             for (const p of this.activeParticles) {
                 if (p.active && !p.isEffect && !p.isIllusionGuard && p.isPlayer && p.y > playerBaseEdge - AURA_RANGE_Y) { 
                       p.power = Math.min(p.initialPower, p.power + HEAL_AMOUNT);
                       if (p.isSpecial && p.tacticType === 'Aegis') {
                           p.power = Math.min(p.initialPower, p.power + HEAL_AMOUNT); 
                       }
                 }
             }
         }
         if (aiStats.skillActiveTimer_Aegis > 0) {
             const { aiBaseEdge } = this.game.getCanvasDimensions();
             const AURA_RANGE_Y = H * 0.2;
             const HEAL_AMOUNT = 0.5 * delta;
             for (const p of this.activeParticles) {
                 if (p.active && !p.isEffect && !p.isIllusionGuard && !p.isPlayer && p.y < aiBaseEdge + AURA_RANGE_Y) { 
                     p.power = Math.min(p.initialPower, p.power + HEAL_AMOUNT);
                     if (p.isSpecial && p.tacticType === 'Aegis') {
                          p.power = Math.min(p.initialPower, p.power + HEAL_AMOUNT);
                     }
                 }
             }
         }
    }
    
    
    // --- 碰撞检测 ---
    
    updateCollisions() {
        this.grid.clear();
        for (const p of this.activeParticles) {
            // v25 S4: 相位单位不参与碰撞
            if (p.isEffect || !p.active || p.isIllusionGuard || p.isPhased) continue; 
            const key = `${Math.floor(p.x / CELL_SIZE)}_${Math.floor(p.y / CELL_SIZE)}`;
            if (!this.grid.has(key)) this.grid.set(key, []);
            this.grid.get(key).push(p);
        }

        for (const p1 of this.activeParticles) {
            if (p1.isEffect || !p1.active || p1.isPhased || p1.isIllusionGuard) continue;
            
            const cx = Math.floor(p1.x / CELL_SIZE);
            const cy = Math.floor(p1.y / CELL_SIZE);

            for (let x = -1; x <= 1; x++) {
                for (let y = -1; y <= 1; y++) {
                    const key = `${cx + x}_${cy + y}`;
                    if (this.grid.has(key)) {
                        for (const p2 of this.grid.get(key)) {
                            // S4: p2 也不能是 Phased
                            if (p1 === p2 || !p2.active || p1.isPlayer === p2.isPlayer || p2.isPhased || p2.isIllusionGuard) continue;
                            const dx = p1.x - p2.x; const dy = p1.y - p2.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            const collideDist = p1.radius + p2.radius;
                            if (dist < collideDist * 0.8) {
                                this.handleCollision(p1, p2);
                                if (!p1.active) break;
                            }
                        }
                    }
                    if (!p1.active) break;
                }
                if (!p1.active) break;
            }
        }
    }
    
    handleCollision(p1, p2) {
        const playerStats = this.game.getPlayerStats();
        const aiStats = this.game.getAiStats();
        
        if (!p1.active || !p2.active || p1.isPlayer === p2.isPlayer || p1.isPhased || p2.isPhased || p1.isIllusionGuard || p2.isIllusionGuard) return;
                 
         const playerAetherBase = (playerStats.class === 'Elementalist') ? 0.3 * 1.25 : 0.3;
         const aiAetherBase = (aiStats.class === 'Elementalist') ? 0.3 * 1.25 : 0.3;
         
         let playerAetherGain = playerAetherBase;
         if (playerStats.skillActiveTimer_Aegis > 0) playerAetherGain *= 0.5;
         
         let aiAetherGain = aiAetherBase;
         if (aiStats.skillActiveTimer_Aegis > 0) aiAetherGain *= 0.5;

         playerStats.aether = Math.min(playerStats.aetherCost * AETHER_BANK_CAP_MULTIPLIER, playerStats.aether + playerAetherGain);
         aiStats.aether = Math.min(aiStats.aetherCost * AETHER_BANK_CAP_MULTIPLIER, aiStats.aether + aiAetherGain);
         
         const midX = (p1.x + p2.x) / 2;
         const midY = (p1.y + p2.y) / 2;
         
         // v25 S5: 修复 power < 0 的 BUG
         let p1HitPower = Math.max(0, p1.power);
         let p2HitPower = Math.max(0, p2.power);

         // v25 S2: 爆发战意
         if (p1.burstTimer > 0) p1HitPower *= 1.5;
         if (p2.burstTimer > 0) p2HitPower *= 1.5;
         
         // v25 S4: 幻影刺客
         if (p1.isSpecial && p1.tacticType === 'Illusionist' && p1.doubleDamageTimer > 0) p1HitPower *= 2.0;
         if (p2.isSpecial && p2.tacticType === 'Illusionist' && p2.doubleDamageTimer > 0) p2HitPower *= 2.0;
         
         const { H, playerBaseEdge, aiBaseEdge } = this.game.getCanvasDimensions();
         const AURA_RANGE_Y = H * 0.2;
         if (p1.isPlayer && playerStats.skillActiveTimer_Aegis > 0 && p1.y > playerBaseEdge - AURA_RANGE_Y) p2HitPower *= 0.7; 
         if (!p1.isPlayer && aiStats.skillActiveTimer_Aegis > 0 && p1.y < aiBaseEdge + AURA_RANGE_Y) p2HitPower *= 0.7; 
         
         if (p2.isPlayer && playerStats.skillActiveTimer_Aegis > 0 && p2.y > playerBaseEdge - AURA_RANGE_Y) p1HitPower *= 0.7; 
         if (!p2.isPlayer && aiStats.skillActiveTimer_Aegis > 0 && p2.y < aiBaseEdge + AURA_RANGE_Y) p1HitPower *= 0.7; 


         if (p1HitPower > p2HitPower) {
             // p1 获胜
             if (p2.isPlayer && playerStats.class === 'Illusionist' && !p2.isSpecial && !p1.isSpecial && Math.random() < 0.15) {
                 p1.power -= p2HitPower; 
             } else {
                 p1.power -= p2HitPower; 
                 p2.active = false; 
                 this.spawnSpark(midX, midY, p1.hue, p1.saturation, p1.lightness, 2); 
             }
             
             if (p1.isPlayer && playerStats.burnOnHit > 0 && !p2.isEffect) { p2.burnTimer = 2.0; p2.burnDamage = playerStats.burnOnHit; }
             if (!p1.isPlayer && aiStats.burnOnHit > 0 && !p2.isEffect) { p2.burnTimer = 2.0; p2.burnDamage = aiStats.burnOnHit; }

             // v25 S3: 爆破冲击
             if (p1.isPlayer && playerStats.expertiseDamage === 'BlastImpact') this.triggerSplashDamage(p2.x, p2.y, true, p1HitPower * 0.1);
             if (!p1.isPlayer && aiStats.expertiseDamage === 'BlastImpact') this.triggerSplashDamage(p2.x, p2.y, false, p1HitPower * 0.1);

             if (!p2.active) { 
                 if (p2.isSpecial) {
                     if (p2.tacticType === 'Berserker') this.triggerExplosion(p2.x, p2.y, p2.isPlayer, p2.initialPower * 0.5);
                     else if (p2.tacticType === 'Commander') this.spawnVeterans(p2.x, p2.y, p2.isPlayer, 3);
                     else if (p2.tacticType === 'Elementalist') this.triggerExplosion(p2.x, p2.y, p2.isPlayer, p2.initialPower, 'burn');
                     else if (p2.tacticType === 'Aegis') this.triggerAegisHeal(p2.x, p2.y, p2.isPlayer, p2.initialPower * 0.3);
                 }
                 this.updateParticleVisuals(p1);
             }
             
         } else if (p2HitPower > p1HitPower) {
             // p2 获胜
             if (p1.isPlayer && playerStats.class === 'Illusionist' && !p1.isSpecial && !p2.isSpecial && Math.random() < 0.15) {
                 p2.power -= p1HitPower; 
             } else {
                 p2.power -= p1HitPower; 
                 p1.active = false; 
                 this.spawnSpark(midX, midY, p2.hue, p2.saturation, p2.lightness, 2); 
             }
             
             if (p2.isPlayer && playerStats.burnOnHit > 0 && !p1.isEffect) { p1.burnTimer = 2.0; p1.burnDamage = playerStats.burnOnHit; }
             if (!p2.isPlayer && aiStats.burnOnHit > 0 && !p1.isEffect) { p1.burnTimer = 2.0; p1.burnDamage = aiStats.burnOnHit; }
 
             // v25 S3: 爆破冲击
             if (p2.isPlayer && playerStats.expertiseDamage === 'BlastImpact') this.triggerSplashDamage(p1.x, p1.y, true, p2HitPower * 0.1);
             if (!p2.isPlayer && aiStats.expertiseDamage === 'BlastImpact') this.triggerSplashDamage(p1.x, p1.y, false, p2HitPower * 0.1);

             if (!p1.active) { 
                 if (p1.isSpecial) {
                     if (p1.tacticType === 'Berserker') this.triggerExplosion(p1.x, p1.y, p1.isPlayer, p1.initialPower * 0.5);
                     else if (p1.tacticType === 'Commander') this.spawnVeterans(p1.x, p1.y, p1.isPlayer, 3);
                     else if (p1.tacticType === 'Elementalist') this.triggerExplosion(p1.x, p1.y, p1.isPlayer, p1.initialPower, 'burn');
                     else if (p1.tacticType === 'Aegis') this.triggerAegisHeal(p1.x, p1.y, p1.isPlayer, p1.initialPower * 0.3);
                 }
                 this.updateParticleVisuals(p2);
             }
         } else {
             // 平局
             if (p1.isPlayer && playerStats.class === 'Illusionist' && !p1.isSpecial && !p2.isSpecial && Math.random() < 0.15) { /* p1 存活 */ } else { p1.active = false; }
             if (p2.isPlayer && playerStats.class === 'Illusionist' && !p2.isSpecial && !p1.isSpecial && Math.random() < 0.15) { /* p2 存活 */ } else { p2.active = false; }
 
             this.spawnSpark(midX, midY, 0, 0, 100, 1);
             
             if (!p1.active && p1.isSpecial) {
                if (p1.tacticType === 'Berserker') this.triggerExplosion(p1.x, p1.y, p1.isPlayer, p1.initialPower * 0.5);
                else if (p1.tacticType === 'Commander') this.spawnVeterans(p1.x, p1.y, p1.isPlayer, 3);
                else if (p1.tacticType === 'Elementalist') this.triggerExplosion(p1.x, p1.y, p1.isPlayer, p1.initialPower, 'burn');
                else if (p1.tacticType === 'Aegis') this.triggerAegisHeal(p1.x, p1.y, p1.isPlayer, p1.initialPower * 0.3);
             }
             if (!p2.active && p2.isSpecial) {
                if (p2.tacticType === 'Berserker') this.triggerExplosion(p2.x, p2.y, p2.isPlayer, p2.initialPower * 0.5);
                else if (p2.tacticType === 'Commander') this.spawnVeterans(p2.x, p2.y, p2.isPlayer, 3);
                else if (p2.tacticType === 'Elementalist') this.triggerExplosion(p2.x, p2.y, p2.isPlayer, p2.initialPower, 'burn');
                else if (p2.tacticType === 'Aegis') this.triggerAegisHeal(p2.x, p2.y, p2.isPlayer, p2.initialPower * 0.3);
             }
         }
    }
    
    // v25 S5: 确保此函数存在
    updateParticleVisuals(p) {
        if (!p || !p.active || p.isLarva || p.isEffect || p.isIllusionGuard) return; 
        
        // v25 S5: 修复 power < 0
        const powerNormal = Math.min(Math.max(0, p.power / (p.initialPower + 0.1)), 1.0); 
        
        if (!p.isSpecial && !p.isVeteran) {
             p.radius = 3 + 5 * powerNormal;
             p.lightness = 50 + 30 * powerNormal;
        } else if (p.isSpecial) {
             const powerNormalSpecial = Math.min(Math.max(0, p.power / (p.initialPower + 0.1)), 1.0);
             p.radius = 9 + 7 * powerNormalSpecial;
             p.lightness = 60 + 30 * powerNormalSpecial;
        }
    }
}