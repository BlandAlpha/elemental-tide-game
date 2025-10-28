// particle.js: 定义 Particle 类
// 这个文件只负责定义“一个”粒子的属性和行为。

export class Particle {
    constructor() { 
        this.active = false;
        // 在构造函数中调用 reset() 是一个好习惯
        this.reset(); 
    }
    
    reset() {
        this.active = false; this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
        this.radius = 4; this.power = 1; this.isSpecial = false; 
        this.isEffect = false; this.life = 1;
        this.hue = 0; this.saturation = 0; this.lightness = 0;
        
        this.initialPower = 1; 
        
        this.tacticType = 'Berserker'; 
        this.spawnTimer = 0; 
        this.isOverloaded = false; 
        this.isLarva = false; 
        this.isVeteran = false; 
        
        this.burnTimer = 0;
        this.burnDamage = 0;
        // v25 S2/S4
        this.burstTimer = 0; // S2: 爆发战意
        this.doubleDamageTimer = 0; // S4: 幻影刺客
        this.boostTimer = 0; // P5/S4: 虫群/幻术师
        
        this.isPhased = false; // S4: 幻术师
        // this.phaseTimer = 0; // S4: 移除
        
        this.isIllusionGuard = false; 
        this.isShockwave = false;
        this.endRadius = 70;
        // this.trailTimer = 0; // v25 P2: 移除旧的拖尾计时器
        
        // v25 P2: "完美拖尾" 需要记录上一帧的位置
        this.oldX = 0;
        this.oldY = 0;
    }

    // init, initSpark, initShockwave...
    
    init(x, y, isPlayer, power, isSpecial, tacticType, isLarva, isVeteran, stats, H) {
         this.active = true; this.x = x; this.y = y; this.isPlayer = isPlayer;
         
         // v25 P2: 初始化 oldX/oldY
         this.oldX = x;
         this.oldY = y;
         
         this.power = power; 
         this.initialPower = power; 
         this.isSpecial = isSpecial;
         this.tacticType = tacticType;
         this.isLarva = isLarva;
         this.isVeteran = isVeteran; 
         this.isOverloaded = false; 
         this.isEffect = false; this.life = 1; this.isIllusionGuard = false;
         
         this.burnTimer = 0; this.burnDamage = 0; this.doubleDamageTimer = 0;
         this.boostTimer = 0; this.isPhased = false; 
         this.isShockwave = false;
         
         // v25 S2: 爆发战意
         if (stats.expertiseDamage === 'BurstIntent') {
             this.burstTimer = 2.5;
         } else {
             this.burstTimer = 0;
         }
         
         let baseSpeed = H * 0.0008 + Math.random() * 0.5;
         baseSpeed *= stats.speedMod;
         
         // v25 P5: 虫群幼虫
         if (isLarva) {
             baseSpeed *= 1.1; 
             this.boostTimer = 1.5; // 幼虫爆发
             baseSpeed *= 1.5;
         } 
         if (isVeteran) baseSpeed *= 1.2; 
         
         if (!isSpecial && !isLarva && !isVeteran) {
             baseSpeed *= stats.basicSpeedMod;
         }
         
         this.vy = isPlayer ? -baseSpeed : baseSpeed;
         this.vx = (Math.random() - 0.5) * 0.8;
         
         if (this.isPlayer) {
             this.hue = Math.random() * 20; 
             if (isSpecial && tacticType === 'Aegis') this.hue = 60; 
         } else {
             this.hue = 190 + Math.random() * 20; 
             if (isSpecial && tacticType === 'Aegis') this.hue = 180; 
         }
         
         this.saturation = 100;
         
         if (isLarva) {
             this.radius = 2;
             this.lightness = 40;
         } else if (isVeteran) {
             this.radius = 6;
             this.lightness = 70; 
         } else if (isSpecial) {
             const powerNormal = Math.min(this.power / (75.0 * stats.tacticPowerMod), 1.0); 
             this.radius = 9 + 7 * powerNormal; 
             this.vy *= 0.8;
             this.lightness = 60 + 30 * powerNormal; 
             if (tacticType === 'Swarm') {
                 this.spawnTimer = 1.0 + Math.random() * 1.0; 
             }
             // v25 S4: 幻影刺客
             if (tacticType === 'Illusionist') {
                 this.doubleDamageTimer = 3.0; // 3秒 2x 伤害
                 this.vy *= 1.5; 
                 this.radius *= 0.8; 
             }
             if (tacticType === 'Aegis') {
                 this.vy *= 0.9; 
                 this.radius *= 1.1; 
                 this.lightness = 80; 
             }
         } else {
             const powerNormal = Math.min(this.power / 15.0, 1.0); 
             this.radius = 3 + 5 * powerNormal; 
             this.lightness = 50 + 30 * powerNormal; 
         }
    }
     
    initSpark(x, y, hue, saturation, lightness, isExplosion = false) {
         // ... (代码不变) ...
         this.active = true; this.x = x; this.y = y;
         const angle = Math.random() * Math.PI * 2;
         let speed = Math.random() * 5 + 2;
         if (isExplosion) speed *= 2.5; 
         this.vx = Math.cos(angle) * speed; 
         this.vy = Math.sin(angle) * speed;
         this.radius = Math.random() * 3 + 1;
         if (isExplosion) this.radius *= 2;
         this.isEffect = true;
         this.life = 1.0; 
         this.power = 0; this.isSpecial = false; this.isShockwave = false;
         this.hue = hue; this.saturation = saturation; this.lightness = lightness;
    }
     
    initShockwave(x, y, hue, saturation, lightness, endRadius) {
         // ... (代码不变) ...
         this.active = true; this.x = x; this.y = y;
         this.isEffect = true;
         this.isShockwave = true;
         this.life = 1.0;
         this.radius = 1;
         this.endRadius = endRadius;
         this.hue = hue; this.saturation = saturation; this.lightness = lightness;
         this.power = 0; this.isSpecial = false;
         this.vx = 0; this.vy = 0;
    }

    // draw()
    draw(ctx, trailCtx) {
        if (!this.active) return;
        
        // 新的拖尾逻辑: 在 trailCtx 上绘制轨迹
        if (this.isPhased && this.boostTimer > 0 && trailCtx) {
            trailCtx.strokeStyle = `hsla(270, 100%, 85%, 0.8)`; // 更亮、更不透明的紫色
            trailCtx.lineWidth = this.radius * 1.5; // 拖尾宽度
            trailCtx.lineCap = 'round';
            trailCtx.beginPath();
            trailCtx.moveTo(this.oldX, this.oldY); // 从上一帧的位置
            trailCtx.lineTo(this.x, this.y);      // 拉到当前帧的位置
            trailCtx.stroke();
        }

        if (this.isEffect) {
            // ... (绘制激波) ...
            if (this.isShockwave) {
                ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, ${this.lightness}%, ${this.life * 0.8})`;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.stroke();
                return;
            }
            
            // ... (绘制火花) ...
            ctx.shadowBlur = 15;
            ctx.shadowColor = `hsl(${this.hue}, ${this.saturation}%, ${this.lightness}%)`;
            ctx.fillStyle = `hsla(${this.hue}, ${this.saturation}%, ${this.lightness}%, ${this.life * 0.8})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        } else {
            // ... (绘制守卫) ...
            if (this.isIllusionGuard) {
                ctx.fillStyle = `hsla(270, 100%, 80%, ${this.life / 5.0 * 0.4})`; 
                ctx.strokeStyle = `hsla(270, 100%, 90%, ${this.life / 5.0 * 0.6})`;
                ctx.lineWidth = 2;
                const size = this.radius * 2;
                ctx.beginPath();
                ctx.rect(this.x - this.radius * 0.7, this.y - this.radius, size * 0.7, size);
                ctx.fill();
                ctx.stroke();
                return; 
            }
            
            // v25 S4: 相位特效 (保持无敌闪烁)
            if (this.isPhased) {
                // 闪烁
                ctx.globalAlpha = 0.3 + Math.sin(performance.now() / 50) * 0.3;
            }

            let glow = 0;
            if (this.isSpecial || this.isVeteran) {
                // ... (战术单位辉光) ...
                let powerNormal = 0;
                if (this.isVeteran) powerNormal = 0.3; 
                else powerNormal = Math.min(this.power / (this.initialPower + 0.1), 1.0);
                glow = 5 + 25 * powerNormal; 
                ctx.shadowBlur = glow;
                ctx.shadowColor = `hsl(${this.hue}, ${this.saturation}%, ${this.lightness}%)`;
            }
            
            if (this.isOverloaded) {
                // ... (过载辉光) ...
                ctx.shadowBlur = 40;
                ctx.shadowColor = `hsl(60, 100%, 80%)`;
            }
            // v25 S4: 幻影刺客
            if (this.doubleDamageTimer > 0) {
                ctx.shadowBlur = 30;
                ctx.shadowColor = `hsl(270, 100%, 80%)`; 
            }
            // v25 S2: 爆发战意
            if (this.burstTimer > 0) {
                ctx.shadowBlur = (ctx.shadowBlur || 0) + 20; // 叠加辉光
                ctx.shadowColor = `hsl(0, 100%, 80%)`; // 红色辉光
            }

            // 绘制粒子本体
            ctx.fillStyle = `hsl(${this.hue}, ${this.saturation}%, ${this.lightness}%)`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            
            if (glow > 0 || this.isOverloaded || this.doubleDamageTimer > 0 || this.burstTimer > 0) {
                ctx.shadowBlur = 0;
            }

            // v25 S5: BUG修复 - 模拟辉光调小
            if (!this.isSpecial && !this.isVeteran && !this.isLarva) {
                ctx.globalAlpha = this.isPhased ? 0.05 : 0.15; 
                ctx.fillStyle = `hsl(${this.hue}, ${this.saturation}%, ${this.lightness}%)`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius * 1.8, 0, Math.PI * 2); // v25 S5: 2.5 -> 1.8
                ctx.fill();
                ctx.globalAlpha = this.isPhased ? (0.3 + Math.sin(performance.now() / 50) * 0.3) : 1.0;
            }

            // ... (燃烧特效) ...
            if (this.burnTimer > 0) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = `rgba(255, 100, 0, 0.8)`;
                ctx.fillStyle = `hsla(30, 100%, 50%, ${0.5 + Math.sin(performance.now() / 100) * 0.5})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
            
            if (this.isPhased) {
                ctx.globalAlpha = 1.0;
            }
        }
    }
    
    // v25 S4: 幻术师逻辑重构
    update(delta, W, H, playerStats, aiStats, playerBaseEdge, aiBaseEdge, particleManager) {
        if (!this.active) return;
        
        // v25 P2: 在所有移动之前，记录当前位置
        this.oldX = this.x;
        this.oldY = this.y;
         
        // --- 1. 守卫/特效 逻辑 (无移动) ---
        if (this.isIllusionGuard) {
            this.life -= delta;
            if (this.life <= 0 || this.power <= 0) { 
                this.active = false;
            }
            return; 
        }

        if (this.isShockwave) {
            this.life -= delta * 3.0; 
            this.radius = (1.0 - this.life) * this.endRadius;
            if (this.life <= 0) this.active = false;
            return;
        }
        
        // v25 P2: 拖尾特效 (记录旧位置)
        // (旧逻辑已移到 update 顶部)
        // const oldX = this.x;
        // const oldY = this.y;
        
        if (this.isEffect) {
            this.life -= 0.04; 
            this.radius *= 0.96;
            this.vx *= 0.95; 
            this.vy *= 0.95;
            this.x += this.vx; this.y += this.vy; // 特效也移动
            if (this.life <= 0 || this.radius < 0.2) this.active = false;
            return;
        }
        
        // --- 2. 计时器更新 ---
        
        // v25 P5/S4: 增益/减益计时器
        if (this.boostTimer > 0) {
            this.boostTimer -= delta;
            if (this.boostTimer <= 0) {
                 if (this.isPhased) { // v25 S4: 相位冲刺结束
                    this.isPhased = false; 
                    this.vy /= 5.0; 
                    this.vx /= 5.0;
                 } else if (this.isLarva) { // v25 P5: 幼虫爆发结束
                    this.vy /= 1.5;
                 } else { // 虫群技能爆发结束
                    this.vy /= 1.5;
                 }
            }
        }
        
        if (this.burstTimer > 0) this.burstTimer -= delta; // v25 S2
        if (this.doubleDamageTimer > 0) this.doubleDamageTimer -= delta; // v25 S4
        if (this.burnTimer > 0) this.burnTimer -= delta;
        
        // --- 3. 移动 ---
        this.x += this.vx; this.y += this.vy;
        
        // --- 4. 核心战斗单位逻辑 ---

        // v25 S4: [相位] 状态逻辑 (无敌冲刺)
        if (this.isPhased) {
            
            // v25 P2: 拖尾特效 (移除旧的 spark 逻辑)
            /*
            if (this.boostTimer > 0) {
                this.trailTimer -= delta;
                if (this.trailTimer <= 0) {
                    // 在旧位置产生一个拖尾火花
                    particleManager.spawnSpark(oldX, oldY, 270, 100, 80, 1, false);
                    this.trailTimer = 0.02; // 每 0.02 秒一个点
                }
            }
            */
            
            // 检查护盾
            const shieldStats = this.isPlayer ? aiStats : playerStats;
            const targetBaseEdge = this.isPlayer ? aiBaseEdge : playerBaseEdge;
            let hitShield = false;
            let shieldY = 0;
            
            if (shieldStats.shieldTimer > 0) {
                const t = this.x / W;
                const shieldAlpha = Math.min(1.0, shieldStats.shield / 50.0);
                shieldY = targetBaseEdge + (this.isPlayer ? 1 : -1) * 60 * t * (1 - t) * shieldAlpha;
                hitShield = this.isPlayer ? (this.y < shieldY) : (this.y > shieldY);
            }
            
            if (hitShield) {
                // S4: 撞击护盾: 1.0x 伤害给护盾 + 0.3x 爆炸 (不伤基地)
                particleManager.triggerPhaseExplosionOnShield(!this.isPlayer, this.power, this.x, shieldY); 
                this.active = false;
                return;
            }
            
            // 检查基地
            const hitBase = this.isPlayer ? (this.y < targetBaseEdge) : (this.y > targetBaseEdge);
            if (hitBase) {
                // S4: 撞击基地: 1.3x 伤害给基地 + 0.3x 爆炸 (不伤基地)
                particleManager.triggerBaseHitEffect(!this.isPlayer, this.power * 1.3, this.x); 
                particleManager.triggerExplosion(this.x, targetBaseEdge, this.isPlayer, this.power * 0.3, 'arcane', true); // 'true' = excludeBase
                this.active = false;
                return;
            }
            
            // S4: 检查反弹
            if (this.x < this.radius || this.x > W - this.radius) {
                this.vx *= -1.0; // 反弹
                this.x = Math.max(this.radius, Math.min(W - this.radius, this.x));
            }
            
            // [相位] 状态下无敌，跳过所有其他逻辑
            return;
        }
        
        // --- 5. [非相位] 单位逻辑 ---
        
        // 燃烧伤害
        if (this.burnTimer > 0) {
            this.power -= this.burnDamage * delta; 
            if (this.power <= 0) {
                this.active = false;
                particleManager.spawnSpark(this.x, this.y, 30, 100, 50, 3); 
                return; 
            }
        }

        // 撞墙
        if (this.x < this.radius || this.x > W - this.radius) {
            this.vx *= -0.8; 
            this.x = Math.max(this.radius, Math.min(W - this.radius, this.x));
        }
        
        // 虫群孵化
        if (this.isSpecial && this.tacticType === 'Swarm') {
            this.spawnTimer -= delta;
            if (this.spawnTimer <= 0) {
                particleManager.spawnLarva(this.x, this.y, this.isPlayer, this.initialPower); 
                this.spawnTimer = 2.0; 
            }
        }
        
        // 护盾碰撞 (非相位)
        if (this.isPlayer && aiStats.shieldTimer > 0) {
            const t = this.x / W;
            const shieldAlpha = Math.min(1.0, aiStats.shield / 50.0);
            const shieldY = aiBaseEdge + 60 * t * (1 - t) * shieldAlpha;
            
            if (this.y < shieldY) { 
                this.active = false;
                particleManager.triggerShieldHitEffect(false, this.power, this.x, shieldY);
                return; 
            }
        }
        
        if (!this.isPlayer && playerStats.shieldTimer > 0) {
            const t = this.x / W;
            const shieldAlpha = Math.min(1.0, playerStats.shield / 50.0);
            const shieldY = playerBaseEdge - 60 * t * (1 - t) * shieldAlpha;

            if (this.y > shieldY) { 
                this.active = false;
                particleManager.triggerShieldHitEffect(true, this.power, this.x, shieldY);
                return; 
            }
        }

        // 基地碰撞 (非相位)
        if (this.isPlayer && this.y < aiBaseEdge) {
            particleManager.triggerBaseHitEffect(false, this.power, this.x);
            if (this.isOverloaded) {
                particleManager.triggerBaseHitEffect(true, this.power * 0.08, this.x, true); 
            }
            this.active = false;
        }
        if (!this.isPlayer && this.y > playerBaseEdge) {
            particleManager.triggerBaseHitEffect(true, this.power, this.x);
            if (this.isOverloaded) {
                particleManager.triggerBaseHitEffect(false, this.power * 0.08, this.x, true); 
            }
            this.active = false;
        }
    }
}