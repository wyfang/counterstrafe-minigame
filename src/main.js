import './style.css';
import {
    recomputeBenchmarks, WEAPONS, STATE, MODE, TIMING,
    StrafeLab, MicroStrafe, RhythmState, SymmetryLog,
    PlayerState, P_VELOCITY,
    MicroStrafeVisuals,
    HistoryFreestyle, HistoryTTK, HistoryStrafeLab, HistoryMicroStrafe, HistoryRhythm,
} from './state.js';
import { initInput }                              from './input.js';
import { fireShot, updateTTK, resetTTK }          from './logic.js';
import { updatePhysics }                          from './physics.js';
import {
    startStrafeLab, stopStrafeLab, finishStrafeLab,
    startMicroStrafe, stopMicroStrafe, finishMicroStrafe,
} from './strafelab.js';
import { startRhythm, stopRhythm, updateRhythm }  from './rhythm.js';
import {
    initVelBar, updateLiveDOM, updateSidebar, updateSidebarLabMode,
    updateBenchmarksUI, exportHistoryCSV, exportLabCSV,
    rebuildHistoryDOM, computeAverages, updateSymmetryUI,
    updateLabProgressUI, showLabResults, hideLabResults,
    syncLabConfig, renderRhythmConfig, renderRhythmPresets, syncRhythmConfig,
    setLocale,
} from './ui.js';
import { initRenderer, renderPixi, getScreenSize, setRendererTheme, setRendererLocale } from './renderer.js';

let lastTs = null, fpsFrames = 0, fpsTimer = 0, fpsDisplay;

// ===========================================================================
//  ABOUT PANEL CONTENT
// ===========================================================================
const ABOUT_CONTENT = {
    [MODE.FREESTYLE]: {
        title: 'Freestyle',
        body: `The fundamental drill. Strafe at full speed, press the opposite key to cancel momentum (counter-strafe), then fire the moment speed drops below 73 u/s — the green threshold marker on the velocity bar.
<br><br>
Read the <b>decel bar</b> in the history: short and consistent = clean technique. Always-coasted = releasing the key too early. Gap = a dead window where neither key is held.`,
    },
    [MODE.TTK]: {
        title: 'Time to Shot',
        body: `Reaction + technique under pressure. Strafe freely until the <b>arena glows blue</b> — that's your cue to immediately counter-strafe and shoot. Measures total time from cue to accurate shot.
<br><br>
False starts (firing before the glow) are tracked separately. The delay is random (1.5–10s) so you can't anticipate it. This mirrors the real scenario: you never know when you'll need to stop.`,
    },
    [MODE.STRAFELAB]: {
        title: 'Strafe Lab',
        body: `<b>Wide-peek trainer.</b> Cover the distance quota as fast as possible in the chosen direction — every unit of movement counts. Accurate shots (≤73 u/s) count toward the required total.
<br><br>
The ideal is: sprint at full speed → snap counter-strafe → fire at exactly the threshold → keep strafing. The shot spread score shows whether shots are evenly distributed across the run or all dumped at the start.`,
    },
    [MODE.MICROSTRAFE]: {
        title: 'Micro-Strafe',
        body: `<b>Micro-movement under the threshold.</b> ADAD continuously without overshooting 73 u/s, landing every shot while staying evasive. The arena circle tracks your real position.
<br><br>
<b>Realistic Time to Ready</b> is self-calibrating: it blends your personal counter-strafe speed and coast percentage to estimate how long you'd be stoppable to an enemy. Lower is harder to kill.`,
    },
    [MODE.RHYTHM]: {
        title: 'Rhythm',
        body: `Polyrhythmic metronome for movement timing. Reverse direction on <b>accent beats</b> (large dots), fill on sub-beats and small dots.
<br><br>
Odd signatures (7/8, 11/8) and irrational rhythms break the reflex of predictable, readable ADAD. Once you can strafe cleanly on 7/8 at 160bpm, your movement becomes much harder to time-predict from the enemy's perspective.`,
    },
};

const TRANSLATIONS = {
    en: {
        page_title: 'CS2 Movement Trainer',
        'mode.freestyle': 'Freestyle',
        'mode.ttk': 'Time to Shot',
        'mode.strafelab': 'Strafe Lab',
        'mode.microstrafe': 'Micro-Strafe',
        'mode.rhythm': 'Rhythm',
        live_data: 'Live Data',
        speed: 'Speed',
        phase: 'Phase',
        last_shot: 'Last Shot',
        total_decel: 'Total Decel Time',
        cs_time: 'CS Time',
        cs: 'CS',
        coast: 'Coast',
        avg_tts: 'Avg Time to Shot',
        avg_gap: 'Avg gap time',
        avg_ovl: 'Avg overlap time',
        av_breakdown: 'One at a time',
        av_cs: 'Avg CS duration',
        av_spd: 'Avg speed at shot',
        success_rate: 'Success rate',
        total_shots: 'Total Shots',
        total_actions: 'Total Actions',
        false_starts: 'False Starts',
        direction: 'DIRECTION',
        distance_quota: 'DISTANCE QUOTA',
        accurate_shots: 'ACCURATE SHOTS REQUIRED',
        left_label: '← Left (A)',
        right_label: 'Right (D) →',
        units: 'units',
        presets: 'PRESETS',
        bpm: 'BPM',
        vol: 'VOL',
        segments: 'SEGMENTS',
        segment_hint: 'bars × num/denom · groups',
        add: '+ Add',
        start: 'START',
        symmetry: 'Symmetry',
        reset: 'reset',
        left: '← LEFT',
        right: 'RIGHT →',
        avg_spd_shot: 'Avg Spd@Shot',
        avg_oat: 'Avg One at a Time',
        recorded: 'Recorded',
        export_lab_csv: 'Export Lab CSV',
        export_history_csv: 'Export History as CSV',
        clear_history: 'Clear History',
        retry: 'RETRY',
        back_to_config: 'BACK TO CONFIG',
        sl_desc_strafelab: 'Wide-peek: run the distance fast, shoot at the threshold.',
        sl_desc_microstrafe: 'Micro-movement: stay under the threshold, coast cleanly.',
        weapon_knife: 'Knife',
        weapon_deagle: 'Desert Eagle',
        weapon_m4a4: 'M4A4',
        weapon_m4a1s: 'M4A1-S',
        weapon_ak47: 'AK-47',
        weapon_famas: 'FAMAS',
        weapon_galil: 'Galil AR',
        weapon_awp: 'AWP (Unscoped)',
        lang_target_zh: '中文',
        lang_target_en: 'EN',
        theme_target_light: 'Light',
        theme_target_dark: 'Dark',
        off: 'off',
        start_session: 'START SESSION',
    },
    zh: {
        page_title: 'CS2 运动训练器',
        'mode.freestyle': '自由模式',
        'mode.ttk': '时间到射击',
        'mode.strafelab': '冲刺训练',
        'mode.microstrafe': '微移动',
        'mode.rhythm': '节奏',
        live_data: '实时数据',
        speed: '速度',
        phase: '阶段',
        last_shot: '最后一枪',
        total_decel: '总减速时间',
        cs_time: 'CS 时间',
        cs: 'CS',
        coast: '滑步',
        avg_tts: '平均射击时间',
        avg_gap: '平均空隙时间',
        avg_ovl: '平均重叠时间',
        av_breakdown: '一次完成',
        av_cs: '平均CS时长',
        av_spd: '平均射击速度',
        success_rate: '成功率',
        total_shots: '总射击数',
        total_actions: '总动作数',
        false_starts: '误发次数',
        direction: '方向',
        distance_quota: '距离配额',
        accurate_shots: '准确射击要求',
        left_label: '← 左 (A)',
        right_label: '右 (D) →',
        units: '单位',
        presets: '预设',
        bpm: '节奏',
        vol: '音量',
        segments: '节拍段',
        segment_hint: '小节 × 分子/分母 · 组',
        add: '+ 添加',
        start: '开始',
        stop: '停止',
        symmetry: '对称性',
        reset: '重置',
        left: '← 左侧',
        right: '右侧 →',
        avg_spd_shot: '平均射击速度',
        avg_oat: '平均一次完成',
        recorded: '记录',
        export_lab_csv: '导出训练 CSV',
        export_history_csv: '导出历史 CSV',
        clear_history: '清空历史',
        retry: '重试',
        back_to_config: '返回配置',
        sl_desc_strafelab: '宽视野训练：快速完成距离配额，在阈值处射击。',
        sl_desc_microstrafe: '微移动训练：保持阈值以下，滑步干净。',
        weapon_knife: '刀',
        weapon_deagle: '沙漠之鹰',
        weapon_m4a4: 'M4A4',
        weapon_m4a1s: 'M4A1-S',
        weapon_ak47: 'AK-47',
        weapon_famas: 'FAMAS',
        weapon_galil: 'Galil AR',
        weapon_awp: 'AWP（无镜）',
        lang_target_zh: 'EN',
        lang_target_en: '中文',
        theme_target_light: '亮色',
        theme_target_dark: '暗色',
        off: '关闭',
        start_session: '开始训练',
        stop_session: '停止训练',
        session_complete: '训练完成',
        time: '时间',
        shots: '射击',
        shot_accuracy: '命中准确度',
        avg_speed_shot: '平均射击速度',
        avg_time_to_ready: '平均就绪时间',
        realistic_ttr: '真实就绪时间',
        inaccurate_distance: '不准距离 %',
        shot_spread: '射击分布',
        samples: '次数',
        shot_history: '射击历史',
        export_history_csv: '导出历史 CSV',
    },
};

const ABOUT_CONTENT_ZH = {
    [MODE.FREESTYLE]: {
        title: '自由模式',
        body: `基础练习。全速划步，按相反键取消动量（反划），当速度降到 73 u/s 以下时射击 —— 速度条上的绿色阈值标记。<br><br>查看历史中的 <b>减速条</b>：短而稳定 = 清晰技巧。持续滑步 = 键按得太早。间隙 = 没有按键的空窗。`,
    },
    [MODE.TTK]: {
        title: '时间到射击',
        body: `在压力下的反应与技术。自由划步直到 <b>场地发蓝</b> —— 那是立即反划并射击的提示。衡量从提示到准确射击的总时间。<br><br>提前射击（在蓝光前射击）会被记录为 <span style="color:var(--red)">误发</span>。延迟是随机的（1.5–10 秒），无法提前预判。`,
    },
    [MODE.STRAFELAB]: {
        title: '冲刺训练',
        body: `<b>宽视野训练。</b> 在选定方向上尽快完成距离配额 —— 每个移动单位都计入。准确射击（≤73 u/s）计入所需总数。<br><br>理想操作：全速冲刺 → 迅速反划 → 刚好在阈值射击 → 继续划步。射击分布分数表明你的射击是均匀分布还是集中在开始阶段。`,
    },
    [MODE.MICROSTRAFE]: {
        title: '微移动',
        body: `<b>阈值以下的微动。</b> 持续 ADAD 且不超出 73 u/s，保持每次射击同时规避。屏幕上的圆圈跟踪你的实际位置。<br><br><b>真实就绪时间</b> 会自动校准：它融合你的个人反划速度和滑步比例来估算你在敌人面前可停止的时长。数值越低越难被击中。`,
    },
    [MODE.RHYTHM]: {
        title: '节奏',
        body: `用于移动时机的多节奏节拍器。在重音拍（大点）上反向，小点用于填充。<br><br>不规则拍子（7/8、11/8）和非整数节奏会打破可预测的 ADAD 反应。一旦你能在 160bpm 的 7/8 节奏下稳定划步，你的移动就更难被敌人预测。`,
    },
};

const INSTRUCTIONS = {
    default: {
        en: `<p><span>A / D or ← / →</span> — strafe</p><p><span>LEFT CLICK or SPACE</span> — shoot</p><p>Strafe → counter-strafe → shoot → repeat</p>`,
        zh: `<p><span>A / D 或 ← / →</span> — 划步</p><p><span>左键 或 空格</span> — 射击</p><p>划步 → 反划 → 射击 → 重复</p>`,
    },
    freestyle: {
        en: `<p><span>A / D or ← / →</span> — strafe</p><p><span>LEFT CLICK or SPACE</span> — shoot</p><p>Keep your movement smooth and clean.</p>`,
        zh: `<p><span>A / D 或 ← / →</span> — 划步</p><p><span>左键 或 空格</span> — 射击</p><p>保持移动流畅且干净。</p>`,
    },
    ttk: {
        en: `<p><span>A / D</span> — strafe &nbsp;·&nbsp; <span>WAIT for BLUE GLOW</span> then CS + shoot</p><p>Firing before the glow = <span style="color:var(--red)">False Start</span></p>`,
        zh: `<p><span>A / D</span> — 划步 &nbsp;·&nbsp; <span>等待蓝光</span> 后 CS + 射击</p><p>在蓝光前射击 = <span style="color:var(--red)">误发</span></p>`,
    },
    strafelab: {
        en: `<p><span>A / D</span> — strafe in chosen direction &nbsp;·&nbsp; <span>CLICK / SPACE</span> shoot</p><p>Cover the quota at max speed. Every shot must land at ≤73 u/s.</p>`,
        zh: `<p><span>A / D</span> — 向选定方向划步 &nbsp;·&nbsp; <span>点击 / 空格</span> 射击</p><p>尽可能快地完成配额。每次射击速度须 ≤73 u/s。</p>`,
    },
    microstrafe: {
        en: `<p><span>A / D</span> — ADAD &nbsp;·&nbsp; <span>CLICK / SPACE</span> shoot when accurate &nbsp;·&nbsp; <span>DRAG</span> circle to reposition</p><p>Stay below threshold. Coast clean. Never overshoot on purpose.</p>`,
        zh: `<p><span>A / D</span> — ADAD &nbsp;·&nbsp; <span>点击 / 空格</span> 在准确时射击 &nbsp;·&nbsp; <span>拖动</span> 圆圈重新定位</p><p>保持阈值以下。滑步干净。不要故意超速。</p>`,
    },
    rhythm: {
        en: `<p><span>A / D</span> — reverse direction on the <span>large dot</span></p><p>Medium = sub-accent · small = fill · stay irregular, stay in time</p>`,
        zh: `<p><span>A / D</span> — 在 <span>大点</span> 上反转方向</p><p>中点 = 副重音 · 小点 = 填充 · 保持不规则，保持节奏</p>`,
    },
};

let currentLang = 'en';
let currentTheme = 'dark';

function t(key) {
    return TRANSLATIONS[currentLang][key] ?? TRANSLATIONS.en[key] ?? key;
}

function setDocumentLang() {
    document.documentElement.lang = currentLang === 'zh' ? 'zh-Hans' : 'en';
}

function savePreferences() {
    try {
        localStorage.setItem('counterstrafeLang', currentLang);
        localStorage.setItem('counterstrafeTheme', currentTheme);
    } catch (err) {
        // ignore if storage unavailable
    }
}

function loadPreferences() {
    try {
        const storedLang = localStorage.getItem('counterstrafeLang');
        const storedTheme = localStorage.getItem('counterstrafeTheme');
        if (storedLang === 'zh' || storedLang === 'en') currentLang = storedLang;
        if (storedTheme === 'light' || storedTheme === 'dark') currentTheme = storedTheme;
    } catch (err) {
        // ignore
    }
}

function updateLanguageButton() {
    const button = document.getElementById('lang-toggle');
    if (!button) return;
    // 显示目标语言：当前是英文显示"中文"，当前是中文显示"EN"
    button.textContent = currentLang === 'en' ? '中文' : 'EN';
    console.log('updateLanguageButton:', { currentLang, text: button.textContent });
}

function updateThemeButton() {
    const button = document.getElementById('theme-toggle');
    if (!button) return;
    // 显示目标主题：当前是暗色显示"Light/亮色"，当前是亮色显示"Dark/暗色"
    const isDark = currentTheme === 'dark';
    button.textContent = isDark ? (currentLang === 'zh' ? '亮色' : 'Light') : (currentLang === 'zh' ? '暗色' : 'Dark');
}

function applyTheme() {
    if (currentTheme === 'light') {
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
    }
    setRendererTheme(currentTheme);
    updateThemeButton();
}

function translateStatic() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (!key) return;
        const value = t(key);
        if (value !== undefined) el.textContent = value;
    });
    document.title = t('page_title');
    setDocumentLang();
    setLocale(currentLang);
    setRendererLocale(currentLang);
}

function refreshModeText() {
    const isLab = STATE.currentMode === MODE.STRAFELAB || STATE.currentMode === MODE.MICROSTRAFE;
    const exportButton = document.getElementById('btn-export');
    if (exportButton) exportButton.textContent = isLab ? t('export_lab_csv') : t('export_history_csv');
    if (isLab) {
        const labTitle = document.getElementById('sl-config-title');
        const labDesc = document.getElementById('sl-config-desc');
        if (labTitle) labTitle.textContent = STATE.currentMode === MODE.STRAFELAB ? t('mode.strafelab') : t('mode.microstrafe');
        if (labDesc) labDesc.textContent = STATE.currentMode === MODE.STRAFELAB ? t('sl_desc_strafelab') : t('sl_desc_microstrafe');
    }
}

function setInstructions(mode) {
    const instEl = document.getElementById('instructions');
    if (!instEl) return;
    const block = INSTRUCTIONS[mode] || INSTRUCTIONS.default;
    instEl.innerHTML = block[currentLang] || block.en;
}

function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'zh' : 'en';
    setDocumentLang();
    translateStatic();
    updateLanguageButton();
    refreshModeText();
    setInstructions(STATE.currentMode);
    updateAboutPanel(STATE.currentMode);
    savePreferences();
}

function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme();
    updateThemeButton();
    savePreferences();
}

function setLanguage(lang) {
    if (lang !== 'en' && lang !== 'zh') return;
    currentLang = lang;
    setDocumentLang();
    translateStatic();
    updateLanguageButton();
    refreshModeText();
    setInstructions(STATE.currentMode);
    updateAboutPanel(STATE.currentMode);
    savePreferences();
}

function initializeLanguageAndTheme() {
    loadPreferences();
    setDocumentLang();
    applyTheme();
    translateStatic();
    refreshModeText();
    setInstructions(STATE.currentMode);
}

// ===========================================================================

//  BOOT
// ===========================================================================
async function boot() {
    const container = document.getElementById('canvas-container');
    const app       = await initRenderer(container);
    fpsDisplay      = document.getElementById('fps-counter');

    recomputeBenchmarks();
    initVelBar();
    updateBenchmarksUI();
    loadPreferences();
    applyTheme();
    refreshModeText();
    setInstructions(STATE.currentMode);
    translateStatic();
    updateLanguageButton();
    updateThemeButton();

    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) langBtn.addEventListener('click', toggleLanguage);
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    document.getElementById('weapon-select').addEventListener('change', e => {
        const id = e.target.value;
        if (WEAPONS[id]) { STATE.WPN = WEAPONS[id]; recomputeBenchmarks(); updateBenchmarksUI(); }
    });

    document.getElementById('btn-export').addEventListener('click', () => {
        const isLab = STATE.currentMode === MODE.STRAFELAB || STATE.currentMode === MODE.MICROSTRAFE;
        if (isLab) exportLabCSV(); else exportHistoryCSV();
    });
    const clearButton = document.getElementById('btn-clear');
    if (clearButton) clearButton.addEventListener('click', () => {
        let history;
        switch (STATE.currentMode) {
            case MODE.TTK:        history = HistoryTTK; break;
            case MODE.STRAFELAB:  history = HistoryStrafeLab; break;
            case MODE.MICROSTRAFE:history = HistoryMicroStrafe; break;
            case MODE.RHYTHM:     history = HistoryRhythm; break;
            default:              history = HistoryFreestyle;
        }
        history.length = 0;
        rebuildHistoryDOM();
        computeAverages();
    });

    // ── Mode tabs ──
    const modeTabs = document.querySelectorAll('.mode-tab');
    modeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            if (StrafeLab.active)   { stopStrafeLab(performance.now());   hideLabResults(); }
            if (MicroStrafe.active) { stopMicroStrafe(performance.now()); hideLabResults(); }
            if (RhythmState.active) { stopRhythm(); syncRhythmConfig(); }

            modeTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            STATE.currentMode = tab.dataset.mode;

            const ttk  = STATE.currentMode === MODE.TTK;
            const sl   = STATE.currentMode === MODE.STRAFELAB;
            const ms   = STATE.currentMode === MODE.MICROSTRAFE;
            const rhy  = STATE.currentMode === MODE.RHYTHM;
            const isLab = sl || ms;

            // Reset micro-strafe position when entering the mode
            if (ms) { MicroStrafeVisuals.x = null; MicroStrafeVisuals.y = null; }

            document.querySelectorAll('.ttk-only').forEach(el => el.style.display = ttk ? 'flex' : 'none');
            document.getElementById('sl-config').style.display  = isLab ? 'block' : 'none';
            document.getElementById('rhy-config').style.display = rhy   ? 'block' : 'none';
            document.getElementById('sl-progress').style.display = 'none';
            document.getElementById('canvas-container').classList.toggle('ttk-armed', ttk);
            document.getElementById('hist-section').style.display = 'flex';
            document.getElementById('avg-section').style.display  = (isLab || rhy) ? 'none' : 'block';
            document.getElementById('btn-export').textContent     = isLab ? t('export_lab_csv') : t('export_history_csv');

            if (isLab) {
                const labTitle = document.getElementById('sl-config-title');
                const labDesc  = document.getElementById('sl-config-desc');
                if (labTitle) labTitle.textContent = sl ? t('mode.strafelab') : t('mode.microstrafe');
                if (labDesc) labDesc.textContent = sl
                    ? t('sl_desc_strafelab')
                    : t('sl_desc_microstrafe');
                syncLabConfig(STATE.currentMode);
            }

            // Update About panel
            updateAboutPanel(STATE.currentMode);
            setInstructions(STATE.currentMode);

            resetTTK();
            rebuildHistoryDOM();
            computeAverages();
        });
    });

    // Initialise About panel for default mode
    updateAboutPanel(STATE.currentMode);

    // ── About panel collapse toggle ──
    document.getElementById('about-hdr').addEventListener('click', () => {
        const body   = document.getElementById('about-body');
        const toggle = document.getElementById('about-toggle');
        const hidden = body.style.display === 'none';
        body.style.display = hidden ? 'block' : 'none';
        toggle.textContent = hidden ? '▼' : '▶';
    });

    // ── Direction radios ──
    document.querySelectorAll('input[name="sl-dir"]').forEach(radio => {
        radio.addEventListener('change', e => {
            StrafeLab.direction = MicroStrafe.direction = e.target.value;
        });
    });

    // ── Lab config ──
    initLabConfig();

    // ── Rhythm config ──
    initRhythmConfig();

    // ── Symmetry collapse ──
    document.getElementById('sym-reset-btn').addEventListener('click', () => {
        SymmetryLog.left.length = 0; SymmetryLog.right.length = 0;
        updateSymmetryUI();
    });
    document.getElementById('sym-hdr').addEventListener('click', e => {
        if (e.target.id === 'sym-reset-btn') return;
        const body = document.getElementById('sym-body');
        const section = document.getElementById('sym-section');
        const toggle = document.getElementById('sym-toggle');
        const hidden = body.style.display === 'none';
        body.style.display = hidden ? 'block' : 'none';
        toggle.textContent = hidden ? '▼' : '▶';
        if (hidden && section) {
            const sidebar = document.getElementById('sidebar');
            requestAnimationFrame(() => {
                if (sidebar) {
                    const sidebarRect = sidebar.getBoundingClientRect();
                    const sectionRect = section.getBoundingClientRect();
                    const targetTop = sectionRect.top - sidebarRect.top + sidebar.scrollTop;
                    sidebar.scrollTop = Math.max(0, targetTop - 8);
                } else {
                    section.scrollIntoView({ block: 'start', inline: 'nearest' });
                }
            });
        }
    });

    // ── Lab results overlay buttons ──
    document.getElementById('sl-res-retry').addEventListener('click', () => {
        hideLabResults();
        const now = performance.now();
        if (STATE.currentMode === MODE.STRAFELAB)   { startStrafeLab(now);   syncLabConfig(MODE.STRAFELAB); }
        if (STATE.currentMode === MODE.MICROSTRAFE) { startMicroStrafe(now); syncLabConfig(MODE.MICROSTRAFE); }
    });
    document.getElementById('sl-res-config').addEventListener('click', () => {
        hideLabResults(); syncLabConfig(STATE.currentMode);
    });

    // ── Micro-strafe drag (register BEFORE initInput so it runs first) ──
    initMicroStrafeDrag(app.canvas);

    // ── Input ──
    initInput(app.canvas, updateLiveDOM, () => {
        if (MicroStrafeVisuals.isDragging) return; // don't fire while dragging
        const isLab = STATE.currentMode === MODE.STRAFELAB || STATE.currentMode === MODE.MICROSTRAFE;
        fireShot(performance.now(), isLab ? updateSidebarLabMode : updateSidebar);
    });

    requestAnimationFrame(loop);
}

// ===========================================================================
//  ABOUT PANEL
// ===========================================================================
function updateAboutPanel(mode) {
    const content = currentLang === 'zh' ? ABOUT_CONTENT_ZH[mode] : ABOUT_CONTENT[mode];
    if (!content) return;
    document.getElementById('about-title').textContent = content.title;
    document.getElementById('about-text').innerHTML    = content.body;
}

// ===========================================================================
//  MICRO-STRAFE DRAG
// ===========================================================================
function initMicroStrafeDrag(canvas) {
    const BALL_R   = 40;
    const HIT_R    = BALL_R + 14;  // generous hit area

    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        return { mx: e.clientX - rect.left, my: e.clientY - rect.top };
    }
    function distToCircle(mx, my) {
        const bx = MicroStrafeVisuals.x ?? 0;
        const by = MicroStrafeVisuals.y ?? 0;
        return Math.hypot(mx - bx, my - by);
    }

    canvas.addEventListener('mousemove', e => {
        if (STATE.currentMode !== MODE.MICROSTRAFE) {
            canvas.style.cursor = 'crosshair'; return;
        }
        const { mx, my } = getMousePos(e);
        MicroStrafeVisuals.isHovered = distToCircle(mx, my) <= HIT_R;

        if (MicroStrafeVisuals.isDragging) {
            const { W, H } = getScreenSize();
            let nx = mx + MicroStrafeVisuals._dragOffsetX;
            let ny = my + MicroStrafeVisuals._dragOffsetY;

            const scx = W * 0.5, scy = H * 0.5;
            MicroStrafeVisuals._snapX = Math.abs(nx - scx) <= MicroStrafeVisuals.SNAP_RADIUS;
            MicroStrafeVisuals._snapY = Math.abs(ny - scy) <= MicroStrafeVisuals.SNAP_RADIUS;
            if (MicroStrafeVisuals._snapX) nx = scx;
            if (MicroStrafeVisuals._snapY) ny = scy;

            MicroStrafeVisuals.x = Math.max(BALL_R+8, Math.min(W-BALL_R-8, nx));
            MicroStrafeVisuals.y = Math.max(BALL_R+8, Math.min(H-BALL_R-8, ny));
        }

        canvas.style.cursor = MicroStrafeVisuals.isDragging ? 'grabbing'
            : MicroStrafeVisuals.isHovered ? 'grab'
            : 'crosshair';
    });

    canvas.addEventListener('mousedown', e => {
        if (STATE.currentMode !== MODE.MICROSTRAFE) return;
        const { mx, my } = getMousePos(e);
        if (distToCircle(mx, my) <= HIT_R) {
            MicroStrafeVisuals.isDragging    = true;
            MicroStrafeVisuals._dragOffsetX  = (MicroStrafeVisuals.x ?? 0) - mx;
            MicroStrafeVisuals._dragOffsetY  = (MicroStrafeVisuals.y ?? 0) - my;
            canvas.style.cursor              = 'grabbing';
            e.stopPropagation(); // prevent falling through to shot fire
        }
    });

    window.addEventListener('mouseup', () => {
        if (!MicroStrafeVisuals.isDragging) return;
        MicroStrafeVisuals.isDragging = false;
        MicroStrafeVisuals._snapX     = false;
        MicroStrafeVisuals._snapY     = false;
        canvas.style.cursor = MicroStrafeVisuals.isHovered ? 'grab' : 'crosshair';
    });
}

// ===========================================================================
//  LAB CONFIG
// ===========================================================================
function initLabConfig() {
    document.querySelectorAll('#sl-quota-presets .sl-preset').forEach(btn => {
        btn.addEventListener('click', e => {
            const v = +e.target.dataset.v;
            StrafeLab.quotaUnits = MicroStrafe.quotaUnits = v;
            document.getElementById('sl-quota-custom').value = v;
            document.querySelectorAll('#sl-quota-presets .sl-preset')
                .forEach(b => b.classList.toggle('active', +b.dataset.v === v));
        });
    });
    document.getElementById('sl-quota-custom').addEventListener('change', e => {
        const v = Math.max(50, Math.min(9999, +e.target.value || 400));
        StrafeLab.quotaUnits = MicroStrafe.quotaUnits = v;
        document.getElementById('sl-quota-custom').value = v;
        document.querySelectorAll('#sl-quota-presets .sl-preset').forEach(b => b.classList.remove('active'));
    });
    document.getElementById('sl-quota-dec').addEventListener('click', () => nudgeQuota(-50));
    document.getElementById('sl-quota-inc').addEventListener('click', () => nudgeQuota(50));

    document.querySelectorAll('#sl-shots-presets .sl-preset').forEach(btn => {
        btn.addEventListener('click', e => {
            const v = +e.target.dataset.v;
            StrafeLab.quotaShots = MicroStrafe.quotaShots = v;
            document.querySelectorAll('#sl-shots-presets .sl-preset')
                .forEach(b => b.classList.toggle('active', +b.dataset.v === v));
        });
    });

    document.getElementById('sl-start').addEventListener('click', () => {
        const mode = STATE.currentMode;
        const lab  = mode === MODE.STRAFELAB ? StrafeLab : MicroStrafe;
        if (mode !== MODE.STRAFELAB && mode !== MODE.MICROSTRAFE) return;
        if (lab.active) {
            const r = mode === MODE.STRAFELAB ? stopStrafeLab(performance.now()) : stopMicroStrafe(performance.now());
            syncLabConfig(mode); showLabResults(r);
        } else {
            hideLabResults();
            if (mode === MODE.STRAFELAB) startStrafeLab(performance.now());
            else { startMicroStrafe(performance.now()); MicroStrafeVisuals.x = null; MicroStrafeVisuals.y = null; }
            syncLabConfig(mode);
        }
    });
}

function nudgeQuota(delta) {
    const v = Math.max(50, Math.min(9999, (StrafeLab.quotaUnits || 400) + delta));
    StrafeLab.quotaUnits = MicroStrafe.quotaUnits = v;
    document.getElementById('sl-quota-custom').value = v;
    document.querySelectorAll('#sl-quota-presets .sl-preset').forEach(b => b.classList.remove('active'));
}

// ===========================================================================
//  RHYTHM CONFIG
// ===========================================================================
function initRhythmConfig() {
    renderRhythmPresets(() => renderRhythmConfig(null));
    renderRhythmConfig(null);

    const bpmRange  = document.getElementById('rhy-bpm');
    const bpmNumber = document.getElementById('rhy-bpm-val');
    bpmRange.addEventListener('input',  e => { RhythmState.bpm = +e.target.value; bpmNumber.value = e.target.value; });
    bpmNumber.addEventListener('change', e => {
        const v = Math.max(40, Math.min(300, +e.target.value || 140));
        RhythmState.bpm = v; bpmRange.value = v; bpmNumber.value = v;
    });
    document.getElementById('rhy-bpm-dec').addEventListener('click', () => nudgeBPM(-5));
    document.getElementById('rhy-bpm-inc').addEventListener('click', () => nudgeBPM(5));
    document.getElementById('rhy-vol').addEventListener('input', e => { RhythmState.volume = +e.target.value / 100; });
    document.getElementById('rhy-add-seg').addEventListener('click', () => {
        RhythmState.segments.push({ bars: 1, num: 5, denom: 8, grouping: [3, 2] });
        renderRhythmConfig(null);
    });
    document.getElementById('rhy-start').addEventListener('click', () => {
        if (RhythmState.active) stopRhythm(); else startRhythm(performance.now());
        syncRhythmConfig();
    });
}

function nudgeBPM(delta) {
    const v = Math.max(40, Math.min(300, RhythmState.bpm + delta));
    RhythmState.bpm = v;
    document.getElementById('rhy-bpm').value     = v;
    document.getElementById('rhy-bpm-val').value = v;
}

// ===========================================================================
//  MAIN LOOP
// ===========================================================================
function loop(ts) {
    if (lastTs === null) lastTs = ts;
    const dt = Math.min((ts - lastTs) / TIMING.MS_PER_SECOND, TIMING.MAX_FRAME_TIME);
    lastTs = ts;

    fpsFrames++; fpsTimer += dt;
    if (fpsTimer >= 1) { fpsDisplay.textContent = fpsFrames + ' fps'; fpsFrames = 0; fpsTimer -= 1; }

    updatePhysics(dt, updateSidebar);
    updateTTK(performance.now(), dt);
    updateRhythm(ts);

    // ── Micro-Strafe: integrate actual ball position ──
    if (STATE.currentMode === MODE.MICROSTRAFE && !MicroStrafeVisuals.isDragging) {
        const { W, H } = getScreenSize();
        if (W > 0) {
            if (MicroStrafeVisuals.x === null) MicroStrafeVisuals.x = W * 0.5;
            if (MicroStrafeVisuals.y === null) MicroStrafeVisuals.y = H * 0.5;
            const pxPerUnit = (W * 0.5) / MicroStrafeVisuals.UNITS_TO_HALF_ARENA;
            const R = 40;
            MicroStrafeVisuals.x += PlayerState[P_VELOCITY] * dt * pxPerUnit;
            MicroStrafeVisuals.x  = Math.max(R + 8, Math.min(W - R - 8, MicroStrafeVisuals.x));
        }
    }

    // ── Lab quota completion check ──
    const activeLab = StrafeLab.active ? StrafeLab : MicroStrafe.active ? MicroStrafe : null;
    if (activeLab) {
        const shotsOk = activeLab.quotaShots === 0 ||
            activeLab.shotEvents.filter(s => s.wasAccurate).length >= activeLab.quotaShots;
        if (activeLab.accumulatedUnits >= activeLab.quotaUnits && shotsOk) {
            const r = StrafeLab.active ? finishStrafeLab(performance.now()) : finishMicroStrafe(performance.now());
            syncLabConfig(STATE.currentMode);
            showLabResults(r);
        } else {
            updateLabProgressUI();
        }
    }

    updateLiveDOM();
    renderPixi(ts);
    requestAnimationFrame(loop);
}

document.addEventListener('DOMContentLoaded', boot);
