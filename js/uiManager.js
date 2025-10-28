// uiManager.js: 管理所有 DOM 更新
// 负责: 获取 DOM 元素、更新血条/能量、显示/隐藏弹窗、处理 Tooltip

import { BASE_HEALTH, PLAYER_CLASS_NAMES, AI_CLASS_NAMES, expertiseData, tooltipData, AETHER_COST_INCREASE } from './constants.js';

export class UIManager {
    constructor() {
        this.game = null; // 由 main.js 注入
        this.dom = {}; // 存放所有 DOM 元素的引用
    }
    
    setGameInstance(gameInstance) {
        this.game = gameInstance;
    }
    
    // 1. 在开始时一次性获取所有 DOM 元素
    initDOMElements() {
        this.dom.modal = document.getElementById('modal');
        this.dom.modalTitle = document.getElementById('modal-title');
        this.dom.classSelectionDiv = document.getElementById('class-selection'); 
        this.dom.modalMessage = document.getElementById('modal-message'); 
        this.dom.gameOverButtonsDiv = document.getElementById('game-over-buttons');
        
        this.dom.expertiseModal = document.getElementById('expertise-modal');
        this.dom.expertiseTitle = document.getElementById('expertise-title');
        this.dom.expertiseName1 = document.getElementById('expertise-name-1');
        this.dom.expertiseDesc1 = document.getElementById('expertise-desc-1');
        this.dom.expertiseChoice1 = document.getElementById('expertise-choice-1');
        this.dom.expertiseName2 = document.getElementById('expertise-name-2');
        this.dom.expertiseDesc2 = document.getElementById('expertise-desc-2');
        this.dom.expertiseChoice2 = document.getElementById('expertise-choice-2');
        
        this.dom.playerUIBar = document.getElementById('player-ui-bar');
        this.dom.aiUIBar = document.getElementById('ai-ui-bar');

        this.dom.energyEl = document.getElementById('player-energy');
        this.dom.playerHealthBar = document.getElementById('player-health-bar');
        this.dom.playerHealthText = document.getElementById('player-health-text');
        this.dom.aiHealthBar = document.getElementById('ai-health-bar');
        this.dom.aiHealthText = document.getElementById('ai-health-text');

        this.dom.playerShieldUI = document.getElementById('player-shield-ui');
        this.dom.playerShieldBar = document.getElementById('player-shield-bar');
        this.dom.playerShieldTimer = document.getElementById('player-shield-timer');
        this.dom.aiShieldUI = document.getElementById('ai-shield-ui');
        this.dom.aiShieldBar = document.getElementById('ai-shield-bar');
        this.dom.aiShieldTimer = document.getElementById('ai-shield-timer');

        this.dom.aetherBar = document.getElementById('aether-bar');
        this.dom.aetherText = document.getElementById('aether-text');
        this.dom.skillButton = document.getElementById('skill-button');
        
        this.dom.playerTotalLevelEl = document.getElementById('player-total-level');
        this.dom.playerUiLevelSpeedEl = document.getElementById('player-ui-level-speed');
        this.dom.playerUiLevelPowerEl = document.getElementById('player-ui-level-power');
        this.dom.playerUiLevelSpecialEl = document.getElementById('player-ui-level-special');

        this.dom.playerClassEl = document.getElementById('player-class');
        this.dom.aiClassEl = document.getElementById('ai-class');

        this.dom.costQuantityEl = document.getElementById('cost-quantity');
        this.dom.costDamageEl = document.getElementById('cost-damage');
        this.dom.costTacticEl = document.getElementById('cost-tactic');
        this.dom.levelQuantityEl = document.getElementById('level-quantity'); 
        this.dom.levelDamageEl = document.getElementById('level-damage'); 
        this.dom.levelTacticEl = document.getElementById('level-tactic'); 

        this.dom.aiLevelEl = document.getElementById('ai-level');
        this.dom.aiLevelSpeedEl = document.getElementById('ai-level-speed');
        this.dom.aiLevelPowerEl = document.getElementById('ai-level-power');
        this.dom.aiLevelSpecialEl = document.getElementById('ai-level-special');
        
        this.dom.timerEl = document.getElementById('game-timer-display');

        this.dom.tooltip = document.getElementById('tooltip');
        this.dom.tooltipTitle = document.getElementById('tooltip-title');
        this.dom.tooltipDesc = document.getElementById('tooltip-desc');
        this.dom.tooltipBonus = document.getElementById('tooltip-bonus');
        this.dom.tooltipCost = document.getElementById('tooltip-cost');
        this.dom.tooltipExpertise = document.getElementById('tooltip-expertise');
    }
    
    // 2. 核心更新函数
    updateUI() {
        const playerStats = this.game.getPlayerStats();
        const aiStats = this.game.getAiStats();
        
        if (!playerStats.energy) return; // 防止在 init 完成前调用

        this.dom.energyEl.textContent = Math.floor(playerStats.energy);
        
        const playerMaxHealth = (playerStats.class === 'Aegis') ? BASE_HEALTH * 1.1 : BASE_HEALTH;
        const playerHealthPercent = Math.max(0, playerStats.health / playerMaxHealth) * 100;
        this.dom.playerHealthBar.style.width = `${playerHealthPercent}%`;
        this.dom.playerHealthBar.style.backgroundColor = playerHealthPercent > 50 ? '#22c55e' : (playerHealthPercent > 20 ? '#fbbf24' : '#ef4444');
        this.dom.playerHealthText.textContent = `${Math.floor(playerHealthPercent)}%`;

        const aiMaxHealth = (aiStats.class === 'Aegis') ? BASE_HEALTH * 1.1 : BASE_HEALTH;
        const aiHealthPercent = Math.max(0, aiStats.health / aiMaxHealth) * 100;
        this.dom.aiHealthBar.style.width = `${aiHealthPercent}%`;
        this.dom.aiHealthBar.style.backgroundColor = aiHealthPercent > 50 ? '#22c55e' : (aiHealthPercent > 20 ? '#fbbf24' : '#ef4444');
        this.dom.aiHealthText.textContent = `${Math.floor(aiHealthPercent)}%`;

        // ... (复制 updateUI 的剩余所有逻辑) ...
        
        // 护盾
        if (playerStats.shieldTimer > 0 && playerStats.shield > 0) {
            this.dom.playerShieldUI.style.display = 'block';
            const shieldPercent = (playerStats.shield / playerStats.maxShield) * 100;
            this.dom.playerShieldBar.style.width = `${shieldPercent}%`;
            this.dom.playerShieldTimer.textContent = `${playerStats.shieldTimer.toFixed(1)}s`;
        } else {
            this.dom.playerShieldUI.style.display = 'none';
        }
        if (aiStats.shieldTimer > 0 && aiStats.shield > 0) {
            this.dom.aiShieldUI.style.display = 'block';
            const shieldPercent = (aiStats.shield / aiStats.maxShield) * 100;
            this.dom.aiShieldBar.style.width = `${shieldPercent}%`;
            this.dom.aiShieldTimer.textContent = `${aiStats.shieldTimer.toFixed(1)}s`;
        } else {
            this.dom.aiShieldUI.style.display = 'none';
        }

        // 以太
        const aetherPercent = Math.min(100, (playerStats.aether / playerStats.aetherCost) * 100);
        this.dom.aetherBar.style.width = `${aetherPercent}%`;
        this.dom.aetherText.textContent = `${Math.floor(playerStats.aether)}`;
        
        const skillOnCooldown = playerStats.skillActiveTimer_Berserker > 0 || playerStats.skillActiveTimer_Elementalist > 0 || playerStats.skillActiveTimer_Aegis > 0;
        this.dom.skillButton.disabled = playerStats.aether < playerStats.aetherCost || skillOnCooldown;
        
        if (playerStats.class === 'Berserker' && playerStats.skillActiveTimer_Berserker > 0) {
             this.dom.skillButton.firstElementChild.textContent = `过载中...`;
             this.dom.skillButton.lastElementChild.innerHTML = `(${playerStats.skillActiveTimer_Berserker.toFixed(1)}s)`;
        } else if (playerStats.class === 'Elementalist' && playerStats.skillActiveTimer_Elementalist > 0) {
            this.dom.skillButton.firstElementChild.textContent = `风暴中...`;
            this.dom.skillButton.lastElementChild.innerHTML = `(${playerStats.skillActiveTimer_Elementalist.toFixed(1)}s)`;
        } else if (playerStats.class === 'Aegis' && playerStats.skillActiveTimer_Aegis > 0) {
            this.dom.skillButton.firstElementChild.textContent = `奉献中...`;
            this.dom.skillButton.lastElementChild.innerHTML = `(${playerStats.skillActiveTimer_Aegis.toFixed(1)}s)`;
        } else {
            this.dom.skillButton.firstElementChild.textContent = "释放技能";
            this.dom.skillButton.lastElementChild.innerHTML = `消耗: <span id="aether-cost-text">${playerStats.aetherCost}</span>`;
        }

        // 等级
        const totalPlayerLevel = playerStats.levelSpeed + playerStats.levelPower + playerStats.levelSpecial;
        this.dom.playerTotalLevelEl.textContent = totalPlayerLevel;
        this.dom.playerUiLevelSpeedEl.textContent = playerStats.levelSpeed;
        this.dom.playerUiLevelPowerEl.textContent = playerStats.levelPower;
        this.dom.playerUiLevelSpecialEl.textContent = playerStats.levelSpecial;

        this.dom.costQuantityEl.textContent = playerStats.costSpeed;
        this.dom.costDamageEl.textContent = playerStats.costPower;
        this.dom.costTacticEl.textContent = playerStats.costSpecial;
        this.dom.levelQuantityEl.textContent = playerStats.levelSpeed;
        this.dom.levelDamageEl.textContent = playerStats.levelPower;
        this.dom.levelTacticEl.textContent = playerStats.levelSpecial;

        this.dom.playerClassEl.textContent = PLAYER_CLASS_NAMES[playerStats.class] || '统帅';
        this.dom.aiClassEl.textContent = AI_CLASS_NAMES[aiStats.class] || '统帅';

        // AI UI
        this.dom.aiLevelEl.textContent = aiStats.levelSpeed + aiStats.levelPower + aiStats.levelSpecial;
        this.dom.aiLevelSpeedEl.textContent = aiStats.levelSpeed;
        this.dom.aiLevelPowerEl.textContent = aiStats.levelPower;
        this.dom.aiLevelSpecialEl.textContent = aiStats.levelSpecial;

        // 计时器
        const minutes = Math.floor(Math.max(0, playerStats.gameTimer) / 60);
        const seconds = Math.max(0, Math.floor(playerStats.gameTimer % 60)); 
        this.dom.timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // 按钮禁用
        document.getElementById('upgrade-quantity').disabled = playerStats.energy < playerStats.costSpeed;
        document.getElementById('upgrade-damage').disabled = playerStats.energy < playerStats.costPower;
        document.getElementById('upgrade-tactic').disabled = playerStats.energy < playerStats.costSpecial;
    }
    
    // 3. 弹窗 (Modal) 管理
    
    showClassSelection() {
        this.dom.modal.classList.remove('hidden');
        this.dom.expertiseModal.style.display = 'none';
        this.dom.modalTitle.textContent = "元素洪流";
        this.dom.classSelectionDiv.classList.remove('hidden'); 
        this.dom.modalMessage.classList.add('hidden'); 
        this.dom.gameOverButtonsDiv.classList.add('hidden');
    }
    
    hideModal() {
        this.dom.modal.classList.add('hidden');
        this.dom.expertiseModal.style.display = 'none';
    }
    
    showGameOver(playerWon, customMessage) {
        this.dom.modal.classList.remove('hidden');
        this.dom.expertiseModal.style.display = 'none'; 
        
        if (playerWon === null) {
            this.dom.modalTitle.textContent = "平局";
            this.dom.modalTitle.className = "text-2xl font-bold mb-3 text-center text-gray-400";
        } else {
            this.dom.modalTitle.textContent = playerWon ? "胜利！" : "失败";
            this.dom.modalTitle.className = playerWon ? "text-2xl font-bold mb-3 text-center text-green-400" : "text-2xl font-bold mb-3 text-center text-red-400";
        }
        
        this.dom.classSelectionDiv.classList.add('hidden'); 
        this.dom.modalMessage.classList.remove('hidden'); 
        this.dom.gameOverButtonsDiv.classList.remove('hidden'); 
        
        this.dom.modalMessage.textContent = customMessage ? customMessage : (playerWon ? "你摧毁了对方的元素之源！" : "你的元素之源被摧毁了。");
    }
    
    showExpertiseModal(path, playerStats) {
        const data = expertiseData[path];
        this.dom.expertiseTitle.textContent = data.title;
        
        const choices = Object.keys(data.choices);
        this.dom.expertiseName1.textContent = data.choices[choices[0]].name;
        this.dom.expertiseDesc1.textContent = data.choices[choices[0]].desc;
        this.dom.expertiseChoice1.dataset.choice = choices[0]; 
        
        this.dom.expertiseName2.textContent = data.choices[choices[1]].name;
        this.dom.expertiseDesc2.textContent = data.choices[choices[1]].desc;
        this.dom.expertiseChoice2.dataset.choice = choices[1]; 
        
        this.dom.expertiseModal.style.display = 'flex';
    }
    
    hideExpertiseModal() {
        this.dom.expertiseModal.style.display = 'none';
    }
    
    // 4. Tooltip 管理
    
    showTooltip(e) {
        const target = e.currentTarget;
        const id = target.dataset.tooltipId;
        const title = target.dataset.tooltipTitle;
        const playerStats = this.game.getPlayerStats();
        
        let data = tooltipData[id];
        this.dom.tooltipTitle.textContent = title;
        
        this.dom.tooltipBonus.style.display = 'none';
        this.dom.tooltipCost.style.display = 'none';
        this.dom.tooltipExpertise.style.display = 'none';

        if (id === 'tactic') {
            this.dom.tooltipDesc.innerText = data.desc[playerStats.class] || data.desc['Commander'];
            const expertise = playerStats.expertiseTactic;
            if (expertise && data.expertise[expertise]) {
                this.dom.tooltipExpertise.innerText = data.expertise[expertise];
                this.dom.tooltipExpertise.style.display = 'block';
            }
        } else if (id === 'skill') {
             // 动态插入消耗
             const desc = (tooltipData.skill[playerStats.class] || tooltipData.skill['Commander']);
             this.dom.tooltipDesc.innerText = `${desc}\n(消耗永久增加 ${AETHER_COST_INCREASE})`;
        } else {
            this.dom.tooltipDesc.innerText = data.desc;
            this.dom.tooltipBonus.textContent = data.bonus;
            this.dom.tooltipCost.textContent = data.cost;
            this.dom.tooltipBonus.style.display = 'block';
            this.dom.tooltipCost.style.display = 'block';
            
            const expertise = playerStats[id === 'quantity' ? 'expertiseQuantity' : 'expertiseDamage'];
            if (expertise && data.expertise[expertise]) {
                this.dom.tooltipExpertise.innerText = data.expertise[expertise];
                this.dom.tooltipExpertise.style.display = 'block';
            }
        }
        
        const rect = target.getBoundingClientRect();
        const { W, H } = this.game.getCanvasDimensions();
        
        this.dom.tooltip.style.display = 'block';
        this.dom.tooltip.style.left = `${W / 2 - this.dom.tooltip.offsetWidth / 2}px`; // 居中
        this.dom.tooltip.style.bottom = `${H - rect.top + 8}px`; // 在按钮上方 8px
    }
    
    hideTooltip() {
        this.dom.tooltip.style.display = 'none';
    }
    
    // 5. 获取 UI 尺寸 (用于 game.js)
    getUIBarHeights() {
        return {
            ai: this.dom.aiUIBar.offsetHeight,
            player: this.dom.playerUIBar.offsetHeight
        };
    }
}