// 这是一个 ES 模块。它将是所有 JS 代码的入口点。
// 它负责“粘合”所有其他模块。

// 1. 导入所有需要的模块
import { Game } from './game.js';
import { UIManager } from './uiManager.js';
import { ParticleManager } from './particleManager.js';
import { AIController } from './aiController.js';

// 2. 等待 DOM 加载完毕
document.addEventListener('DOMContentLoaded', () => {
    
    // 3. 获取核心元素
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // 4. 初始化所有模块
    // 这是一个关键的步骤：我们将所有模块需要的引用 (dependencies)
    // 在一开始就“注入”进去，而不是让它们在全局范围内互相抓取。
    
    const particleManager = new ParticleManager();
    
    const uiManager = new UIManager();
    uiManager.initDOMElements(); // 让 UI 模块自己去获取它需要的所有 DOM 元素
    
    const aiController = new AIController();
    
    const game = new Game(ctx, canvas, particleManager, uiManager, aiController);
    
    // 5. 将模块互相连接
    // 例如, game 需要在循环中调用 ai 和 particleManager
    // uiManager 需要 game 来获取状态
    // aiController 需要 game 来获取状态
    
    // 我们将 game 实例传递给需要它的模块
    uiManager.setGameInstance(game);
    aiController.setGameInstance(game);
    particleManager.setGameInstance(game);

    // 6. 绑定事件监听器
    // main.js 负责监听 DOM 事件, 然后调用相应模块的逻辑
    
    // 游戏开始/重置
    document.getElementById('start-commander').addEventListener('click', () => game.startGame('Commander'));
    document.getElementById('start-berserker').addEventListener('click', () => game.startGame('Berserker'));
    document.getElementById('start-swarm').addEventListener('click', () => game.startGame('Swarm'));
    document.getElementById('start-elementalist').addEventListener('click', () => game.startGame('Elementalist'));
    document.getElementById('start-illusionist').addEventListener('click', () => game.startGame('Illusionist'));
    document.getElementById('start-aegis').addEventListener('click', () => game.startGame('Aegis'));
    document.getElementById('restart-button').addEventListener('click', () => game.init());

    // 专精选择
    document.getElementById('expertise-choice-1').addEventListener('click', () => game.selectExpertise(document.getElementById('expertise-choice-1').dataset.choice));
    document.getElementById('expertise-choice-2').addEventListener('click', () => game.selectExpertise(document.getElementById('expertise-choice-2').dataset.choice));

    // 升级按钮
    document.getElementById('upgrade-quantity').addEventListener('click', () => game.playerUpgrade('quantity'));
    document.getElementById('upgrade-damage').addEventListener('click', () => game.playerUpgrade('damage'));
    document.getElementById('upgrade-tactic').addEventListener('click', () => game.playerUpgrade('tactic'));
    
    // 技能按钮
    document.getElementById('skill-button').addEventListener('click', () => game.playerActivateSkill());

    // 提示框 (Tooltip)
    document.querySelectorAll('.tooltip-trigger').forEach(el => {
        el.addEventListener('mousedown', (e) => uiManager.showTooltip(e));
        el.addEventListener('mouseup', () => uiManager.hideTooltip());
        el.addEventListener('mouseleave', () => uiManager.hideTooltip());
        el.addEventListener('touchstart', (e) => { e.preventDefault(); uiManager.showTooltip(e); }, { passive: false });
        el.addEventListener('touchend', (e) => { e.preventDefault(); uiManager.hideTooltip(); }, { passive: false });
    });
    
    // 窗口大小调整
    window.addEventListener('resize', () => game.resizeCanvas());
    // 阻止移动端默认的滚动行为
    document.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });

    // 7. 启动游戏
    game.init(); // 运行初始设置
});