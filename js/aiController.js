// aiController.js: 管理所有 AI 逻辑
// 负责: 决策、升级、使用技能

import { 
    BASE_HEALTH, 
    // v25 S1: 导入新常量
    EXPERTISE_TRIGGER_TOTAL_LEVEL,
    EXPERTISE_TRIGGER_QTY_MIN_LEVEL,
    EXPERTISE_TRIGGER_DMG_MIN_LEVEL,
    EXPERTISE_TRIGGER_TAC_MIN_LEVEL,
    expertiseData 
} from './constants.js';

export class AIController {
    constructor() {
        this.game = null; // 由 main.js 注入
        this.aiDecisionTimer = 0;
    }
    
    setGameInstance(gameInstance) {
        this.game = gameInstance;
    }
    
    updateAI(delta) {
        const aiStats = this.game.getAiStats();
        const playerStats = this.game.getPlayerStats();
        
        const aiMaxHealth = (aiStats.class === 'Aegis') ? BASE_HEALTH * 1.1 : BASE_HEALTH;
        const playerMaxHealth = (playerStats.class === 'Aegis') ? BASE_HEALTH * 1.1 : BASE_HEALTH;
        
        const totalAILevel = aiStats.levelSpeed + aiStats.levelPower + aiStats.levelSpecial;
        // (经济增长移到 game.js 中)
        // aiStats.energy += ENERGY_RATE * (0.9 + totalAILevel * ENERGY_LEVEL_BONUS) * delta; 
        
        this.aiDecisionTimer -= delta * 1000;
        
        // AI 技能决策
        // v25 BUG 修复: 添加对 Commander 和 Illusionist 的冷却检查
        const skillOnCooldown = aiStats.skillActiveTimer_Berserker > 0 || 
                                aiStats.skillActiveTimer_Elementalist > 0 || 
                                aiStats.skillActiveTimer_Aegis > 0 || 
                                aiStats.swarmSpawnBoostTimer > 0 ||
                                aiStats.skillActiveTimer_Commander > 0 ||
                                aiStats.skillActiveTimer_Illusionist > 0;
        
        if (aiStats.aether >= aiStats.aetherCost && !skillOnCooldown) {
            if ((aiStats.class === 'Commander' || aiStats.class === 'Aegis') && aiStats.health < aiMaxHealth * 0.6) {
                this.game.activateSkill(aiStats, false); // 统帅/圣盾低血量开防守
            } else if (aiStats.class === 'Swarm' && playerStats.health < playerMaxHealth * 0.5) {
                 this.game.activateSkill(aiStats, false); // 虫群斩杀
            } else if (aiStats.class === 'Berserker' && aiStats.health < aiMaxHealth * 0.7) {
                 this.game.activateSkill(aiStats, false); // 狂战拼命
            } else if (aiStats.class === 'Elementalist' && Math.random() < 0.1) { 
                 this.game.activateSkill(aiStats, false); // 元素使随机开
            } else if (aiStats.class === 'Illusionist' && Math.random() < 0.1) { 
                 this.game.activateSkill(aiStats, false); // 幻术师随机开
            } else if (Math.random() < 0.3) {
                 this.game.activateSkill(aiStats, false); // 随机使用
            }
        }

        // AI 升级决策
        if (this.aiDecisionTimer <= 0) {
            this.aiDecisionTimer = Math.random() * 800 + 400; 
            
            const prefersPower = aiStats.class === 'Berserker';
            const prefersSpeed = aiStats.class === 'Swarm';
            const prefersTactic = aiStats.class === 'Commander' || aiStats.class === 'Aegis';

            if (aiStats.health < aiMaxHealth * 0.4 && aiStats.energy >= aiStats.costPower) {
                this.aiUpgrade('damage'); 
            }
            else if (prefersTactic && aiStats.energy >= aiStats.costSpecial && aiStats.levelSpecial < aiStats.levelPower) { 
                this.aiUpgrade('tactic');
            } 
            else if (prefersPower && aiStats.energy >= aiStats.costPower) {
                this.aiUpgrade('damage');
            }
            else if (prefersSpeed && aiStats.energy >= aiStats.costSpeed) {
                this.aiUpgrade('quantity');
            }
            else if (aiStats.energy >= aiStats.costSpecial && aiStats.levelSpecial < 5 && Math.random() < 0.2) { 
                this.aiUpgrade('tactic');
            }
            else if (aiStats.energy >= aiStats.costSpeed && aiStats.levelSpeed <= aiStats.levelPower + 2) { 
                this.aiUpgrade('quantity');
            }
            else if (aiStats.energy >= aiStats.costPower) {
                this.aiUpgrade('damage');
            }
            else if (aiStats.energy >= aiStats.costSpeed) {
                this.aiUpgrade('quantity');
            }
        }
    }
    
    // AI 升级
    aiUpgrade(type) {
         const aiStats = this.game.getAiStats();
         let checkExpertise = false;
         
         // v25 S1: 检查专精的通用函数
        const checkExpertiseTrigger = (pathType) => {
            const totalLevel = aiStats.levelSpeed + aiStats.levelPower + aiStats.levelSpecial;
            if (totalLevel < EXPERTISE_TRIGGER_TOTAL_LEVEL) return false;
            
            if (pathType === 'quantity' && aiStats.levelSpeed >= EXPERTISE_TRIGGER_QTY_MIN_LEVEL && !aiStats.expertiseQuantity) return true;
            if (pathType === 'damage' && aiStats.levelPower >= EXPERTISE_TRIGGER_DMG_MIN_LEVEL && !aiStats.expertiseDamage) return true;
            if (pathType === 'tactic' && aiStats.levelSpecial >= EXPERTISE_TRIGGER_TAC_MIN_LEVEL && !aiStats.expertiseTactic) return true;
            return false;
        };
         
         switch (type) {
            case 'quantity':
                if (aiStats.energy >= aiStats.costSpeed) {
                    aiStats.energy -= aiStats.costSpeed; 
                    aiStats.spawnRate += 0.1 * aiStats.speedUpgradeMod; 
                    aiStats.levelSpeed++; 
                    aiStats.costSpeed = Math.floor(aiStats.costSpeed * aiStats.costSpeedMultiplier); 
                    if (checkExpertiseTrigger('quantity')) { 
                        checkExpertise = true; aiStats.pendingExpertise = 'quantity';
                    }
                }
                break;
            case 'damage':
                if (aiStats.energy >= aiStats.costPower) {
                    aiStats.energy -= aiStats.costPower; 
                    let damageGain = 0.8 * aiStats.powerUpgradeMod;
                    // v25 S3: 移除 'Focus' 和 'Nurture'
                    aiStats.power += damageGain; 
                    
                    if (aiStats.class === 'Elementalist') {
                        aiStats.burnOnHit += 0.2;
                    }
    
                    aiStats.levelPower++; 
                    aiStats.costPower = Math.floor(aiStats.costPower * aiStats.costPowerMultiplier); 
                    if (checkExpertiseTrigger('damage')) { 
                        checkExpertise = true; aiStats.pendingExpertise = 'damage';
                    }
                }
                break;
            case 'tactic':
                if (aiStats.energy >= aiStats.costSpecial) {
                    aiStats.energy -= aiStats.costSpecial; 
                    aiStats.specialChance = Math.min(0.5, aiStats.specialChance + 0.03);
                    // v25 S3: 移除 'Synergy'
                    
                    aiStats.levelSpecial++; 
                    aiStats.costSpecial = Math.floor(aiStats.costSpecial * aiStats.costTacticMultiplier); 
                    if (checkExpertiseTrigger('tactic')) { 
                        checkExpertise = true; aiStats.pendingExpertise = 'tactic';
                    }
                }
                break;
        }
         
        // v25 S1: 交叉检查
        if (!checkExpertise && !aiStats.pendingExpertise) {
             if (checkExpertiseTrigger('quantity')) {
                 checkExpertise = true;
                 aiStats.pendingExpertise = 'quantity';
             } else if (checkExpertiseTrigger('damage')) {
                 checkExpertise = true;
                 aiStats.pendingExpertise = 'damage';
             } else if (checkExpertiseTrigger('tactic')) {
                 checkExpertise = true;
                 aiStats.pendingExpertise = 'tactic';
             }
        }
         
         if (checkExpertise) {
             this.aiSelectExpertise(aiStats.pendingExpertise);
         }
    }
    
    // AI 选择专精
    aiSelectExpertise(path) {
        const aiStats = this.game.getAiStats();
        let choice;
        const choices = Object.keys(expertiseData[path].choices);
        
        // v25 S3: 更新 AI 专精选择逻辑
        if (path === 'quantity') {
            choice = (aiStats.class === 'Swarm') ? 'DualHatch' : choices[Math.floor(Math.random() * choices.length)];
        } else if (path === 'damage') {
            choice = (aiStats.class === 'Berserker') ? 'BurstIntent' : choices[Math.floor(Math.random() * choices.length)];
        } else if (path === 'tactic') {
            choice = (aiStats.class === 'Commander') ? 'Legend' : choices[Math.floor(Math.random() * choices.length)];
        } else {
            choice = choices[Math.floor(Math.random() * choices.length)];
        }

        // 应用 AI 专精
        if (path === 'quantity') {
            aiStats.expertiseQuantity = choice;
            if (choice === 'Vanguard') {
                aiStats.basicSpeedMod = 1.2;
            }
        } 
        else if (path === 'damage') {
            aiStats.expertiseDamage = choice;
            // 'BurstIntent' 和 'BlastImpact' 在 particleManager 中处理
        }
        else if (path === 'tactic') {
            aiStats.expertiseTactic = choice;
            if (choice === 'Legend') {
                let legendMod = (aiStats.class === 'Commander') ? 1.45 : 1.25;
                aiStats.tacticPowerMod = legendMod;
            }
        }
        
        aiStats.pendingExpertise = null;
    }
}