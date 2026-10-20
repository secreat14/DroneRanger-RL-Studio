import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Globe2, Pause, PencilRuler, Play, Save, Settings2 } from 'lucide-react';
import './drone-ranger.css';

type Point = { x: number; y: number };
type Obstacle = { x: number; y: number; w: number; h: number; label: string };
type LayoutTool = 'select' | 'waypoint' | 'obstacle';
type LayoutSelection = { kind: 'waypoint' | 'obstacle'; index: number } | null;
type ModelId = 'dqn' | 'ppo' | 'sac' | 'a2c';
type Locale = 'en' | 'zh';
type WorkspacePage = 'run' | 'training' | 'models';

type ModelProfile = {
  id: ModelId;
  name: string;
  family: string;
  description: string;
  color: string;
  softColor: string;
  reward: string;
  success: number;
  stability: number;
  steps: string;
  speed: string;
  params: Array<{ label: string; value: string; hint: string }>;
  path: Point[];
};

const defaultPlannedPath: Point[] = [
  { x: 95, y: 520 }, { x: 190, y: 450 }, { x: 310, y: 400 }, { x: 420, y: 305 },
  { x: 555, y: 275 }, { x: 655, y: 190 }, { x: 790, y: 170 }, { x: 900, y: 92 },
];

const models: ModelProfile[] = [
  {
    id: 'dqn', name: 'DQN', family: 'Value-based', color: '#ffb547', softColor: '#fff2d8',
    description: 'Stable discrete-action baseline with replay memory and a target network.',
    reward: '+184.6', success: 92, stability: 86, steps: '1.84M', speed: '12.8 m/s',
    params: [
      { label: 'Learning rate', value: '5e-4', hint: 'Adam' },
      { label: 'Discount γ', value: '0.99', hint: 'future return' },
      { label: 'Epsilon ε', value: '0.08', hint: 'exploration' },
      { label: 'Replay buffer', value: '100k', hint: 'transitions' },
      { label: 'Batch size', value: '64', hint: 'samples' },
      { label: 'Target sync', value: '1,000', hint: 'steps' },
    ],
    path: [{ x: 95, y: 520 }, { x: 166, y: 466 }, { x: 245, y: 448 }, { x: 323, y: 389 }, { x: 404, y: 320 }, { x: 498, y: 311 }, { x: 584, y: 248 }, { x: 665, y: 205 }, { x: 746, y: 193 }, { x: 822, y: 137 }, { x: 900, y: 92 }],
  },
  {
    id: 'ppo', name: 'PPO', family: 'Policy gradient', color: '#74d3ae', softColor: '#ddf7eb',
    description: 'Balanced on-policy controller with clipped updates and smooth route following.',
    reward: '+201.3', success: 96, stability: 93, steps: '1.26M', speed: '13.4 m/s',
    params: [
      { label: 'Learning rate', value: '3e-4', hint: 'Adam' },
      { label: 'Clip range', value: '0.20', hint: 'policy ratio' },
      { label: 'GAE λ', value: '0.95', hint: 'advantage' },
      { label: 'Discount γ', value: '0.99', hint: 'future return' },
      { label: 'Batch size', value: '64', hint: 'samples' },
      { label: 'Epochs', value: '10', hint: 'per rollout' },
    ],
    path: [{ x: 95, y: 520 }, { x: 186, y: 457 }, { x: 296, y: 414 }, { x: 411, y: 317 }, { x: 548, y: 284 }, { x: 648, y: 197 }, { x: 781, y: 178 }, { x: 900, y: 92 }],
  },
  {
    id: 'sac', name: 'SAC', family: 'Actor–critic', color: '#7aa7ff', softColor: '#e6eeff',
    description: 'Entropy-regularized continuous controller optimized for efficient exploration.',
    reward: '+196.8', success: 94, stability: 90, steps: '1.52M', speed: '14.1 m/s',
    params: [
      { label: 'Learning rate', value: '3e-4', hint: 'actor + critic' },
      { label: 'Temperature α', value: 'Auto', hint: 'entropy' },
      { label: 'Soft update τ', value: '0.005', hint: 'target blend' },
      { label: 'Discount γ', value: '0.99', hint: 'future return' },
      { label: 'Replay buffer', value: '1M', hint: 'transitions' },
      { label: 'Batch size', value: '256', hint: 'samples' },
    ],
    path: [{ x: 95, y: 520 }, { x: 172, y: 472 }, { x: 283, y: 422 }, { x: 389, y: 337 }, { x: 496, y: 300 }, { x: 606, y: 230 }, { x: 713, y: 201 }, { x: 811, y: 149 }, { x: 900, y: 92 }],
  },
  {
    id: 'a2c', name: 'A2C', family: 'Actor–critic', color: '#d095f6', softColor: '#f1e4fb',
    description: 'Synchronous actor–critic reference policy with fast, predictable updates.',
    reward: '+172.1', success: 88, stability: 82, steps: '980k', speed: '12.1 m/s',
    params: [
      { label: 'Learning rate', value: '7e-4', hint: 'RMSprop' },
      { label: 'Discount γ', value: '0.99', hint: 'future return' },
      { label: 'Entropy coef.', value: '0.01', hint: 'exploration' },
      { label: 'Value coef.', value: '0.50', hint: 'critic loss' },
      { label: 'Rollout steps', value: '5', hint: 'n-step' },
      { label: 'Grad. norm', value: '0.50', hint: 'clip' },
    ],
    path: [{ x: 95, y: 520 }, { x: 151, y: 472 }, { x: 235, y: 463 }, { x: 318, y: 398 }, { x: 378, y: 340 }, { x: 474, y: 329 }, { x: 566, y: 266 }, { x: 639, y: 214 }, { x: 728, y: 218 }, { x: 817, y: 146 }, { x: 900, y: 92 }],
  },
];

const modelChinese: Record<ModelId, { family: string; description: string; labels: string[]; hints: string[] }> = {
  dqn: {
    family: '价值型', description: '使用经验回放和目标网络的稳定离散动作基线策略。',
    labels: ['学习率', '折扣因子 γ', '探索率 ε', '回放缓冲区', '批次大小', '目标同步'],
    hints: ['Adam 优化器', '未来回报', '探索概率', '状态转移', '样本数', '步'],
  },
  ppo: {
    family: '策略梯度', description: '使用裁剪更新并能平滑跟随航线的均衡在策略控制器。',
    labels: ['学习率', '裁剪范围', 'GAE λ', '折扣因子 γ', '批次大小', '训练轮数'],
    hints: ['Adam 优化器', '策略比率', '优势估计', '未来回报', '样本数', '每次采样'],
  },
  sac: {
    family: '演员–评论家', description: '通过熵正则化实现高效探索的连续动作控制器。',
    labels: ['学习率', '温度系数 α', '软更新 τ', '折扣因子 γ', '回放缓冲区', '批次大小'],
    hints: ['演员与评论家', '策略熵', '目标混合', '未来回报', '状态转移', '样本数'],
  },
  a2c: {
    family: '演员–评论家', description: '更新快速且结果可预测的同步演员–评论家参考策略。',
    labels: ['学习率', '折扣因子 γ', '熵系数', '价值系数', '采样步数', '梯度范数'],
    hints: ['RMSprop 优化器', '未来回报', '探索强度', '评论家损失', 'n 步回报', '裁剪'],
  },
};

const copy = {
  en: {
    language: 'Language',
    source: 'Visualization source', preview: 'Preview dataset', policy: 'Policy model', policyHelp: 'Choose a strategy to compare its route and configuration',
    environment: 'Environment', environmentName: 'Urban perimeter · 1 km²', activePolicy: 'Active policy', reward: 'Reward', velocity: 'Velocity', battery: 'Battery',
    actual: 'Actual path', planned: 'Planned', restricted: 'Restricted zone', selected: 'Selected strategy', episode: 'Preview episode', seed: 'Sample seed · deterministic',
    success: 'Success', stability: 'Stability', training: 'Training steps', action: 'Action space', discrete: 'Discrete · 8', continuous: 'Continuous · 2',
    reset: 'Reset', parameters: 'MODEL PARAMETERS', configuration: 'configuration', parameterNote: 'Parameters shown for the selected policy profile.',
    play: 'Play episode', pause: 'Pause episode', position: 'Episode position', zoomOut: 'Zoom out', zoomReset: 'Reset map zoom', zoomIn: 'Zoom in', mapControls: 'Map controls',
    layoutEditor: 'Mission layout', layoutHelp: 'Move, add or remove waypoints and obstacles for this preview', editLayout: 'Edit layout', finishEditing: 'Finish editing', selectTool: 'Select & move', addWaypoint: 'Add waypoint', addObstacle: 'Add obstacle', deleteSelected: 'Delete selected', resetLayout: 'Restore default', obstacleWidth: 'Width', obstacleHeight: 'Height', layoutLocal: 'Preview only',
    mapAria: (name: string) => `Top-down mission preview using the ${name} policy`, home: 'HOME', target: 'TARGET',
    obstacles: ['WAREHOUSE', 'RESTRICTED', 'TOWER ZONE'],
  },
  zh: {
    language: '语言',
    source: '可视化数据源', preview: '预览数据集', policy: '策略模型', policyHelp: '选择策略以比较路线表现与模型配置',
    environment: '任务环境', environmentName: '城市边界 · 1 平方公里', activePolicy: '当前策略', reward: '奖励', velocity: '速度', battery: '电量',
    actual: '实际轨迹', planned: '规划路线', restricted: '限制区域', selected: '已选策略', episode: '预览回合', seed: '示例种子 · 确定性',
    success: '成功率', stability: '稳定性', training: '训练步数', action: '动作空间', discrete: '离散 · 8', continuous: '连续 · 2',
    reset: '重置', parameters: '模型参数', configuration: '配置', parameterNote: '以下参数对应当前选中的策略配置。',
    play: '播放回合', pause: '暂停回合', position: '回合进度', zoomOut: '缩小地图', zoomReset: '重置地图缩放', zoomIn: '放大地图', mapControls: '地图控制',
    layoutEditor: '任务布局', layoutHelp: '移动、添加或删除导航点与障碍物以调整当前预览', editLayout: '编辑布局', finishEditing: '完成编辑', selectTool: '选择与移动', addWaypoint: '添加导航点', addObstacle: '添加障碍物', deleteSelected: '删除选中项', resetLayout: '恢复默认', obstacleWidth: '宽度', obstacleHeight: '高度', layoutLocal: '仅当前预览',
    mapAria: (name: string) => `使用 ${name} 策略的俯视任务预览`, home: '起点', target: '目标',
    obstacles: ['仓库', '限制区域', '塔台区域'],
  },
};

const workspaceCopy = {
  en: {
    navigation: 'Workspace pages', run: 'Run', runHint: 'Execute one preview', training: 'Training', trainingHint: 'Configure a new run', models: 'Models', modelsHint: 'Edit policy profiles',
    runStatus: 'Execution engine', runState: 'Frontend preview', trainingStatus: 'Training service', trainingState: 'Configuration only', modelStatus: 'Model changes', modelState: 'Local draft',
    trainingTitle: 'Training configuration', trainingLead: 'Prepare a reproducible run before connecting it to the training service.', runSetup: 'Run setup', policyModel: 'Policy model', environment: 'Environment', timesteps: 'Total timesteps', parallelEnvs: 'Parallel environments', seed: 'Random seed', device: 'Compute device',
    saveConfig: 'Save local configuration', savedConfig: 'Configuration saved locally', backendNote: 'Training is not started from this preview. Connect the training service before enabling run controls.',
    runSummary: 'Run summary', estimated: 'Planned workload', rollout: 'Rollout mode', reproducible: 'Reproducible seed', localOnly: 'Local configuration',
    editorTitle: 'Model editor', editorLead: 'Adjust policy metadata and core parameters without changing the original model files.', modelLibrary: 'Model library', profile: 'Profile', displayName: 'Display name', description: 'Description', learningRate: 'Learning rate', discount: 'Discount factor γ', batchSize: 'Batch size', saveDraft: 'Save local draft', savedDraft: 'Draft saved locally', editorNote: 'Edits remain in this browser session and do not overwrite checkpoints or source configuration.',
    architecture: 'Model architecture', architectureHint: 'Reference network layout', reference: 'REFERENCE', input: 'Input', backbone: 'Backbone', heads: 'Output heads', activation: 'Activation', parameterScale: 'Parameter scale', architectureNote: 'Architecture is a UI reference profile and is not read from a loaded checkpoint.',
  },
  zh: {
    navigation: '工作区页面', run: '运行', runHint: '执行一次预览', training: '训练', trainingHint: '配置新的训练任务', models: '模型', modelsHint: '编辑策略配置',
    runStatus: '运行引擎', runState: '前端预览', trainingStatus: '训练服务', trainingState: '仅配置', modelStatus: '模型修改', modelState: '本地草稿',
    trainingTitle: '训练配置', trainingLead: '在接入训练服务前，先准备可复现的训练任务配置。', runSetup: '任务设置', policyModel: '策略模型', environment: '训练环境', timesteps: '总训练步数', parallelEnvs: '并行环境数', seed: '随机种子', device: '计算设备',
    saveConfig: '保存本地配置', savedConfig: '配置已保存到当前页面', backendNote: '此预览页面不会启动真实训练；接入训练服务后再启用运行控制。',
    runSummary: '任务摘要', estimated: '计划工作量', rollout: '采样方式', reproducible: '可复现种子', localOnly: '本地配置',
    editorTitle: '模型编辑', editorLead: '调整策略说明与核心参数，不直接改写原始模型文件。', modelLibrary: '模型列表', profile: '模型配置', displayName: '显示名称', description: '模型说明', learningRate: '学习率', discount: '折扣因子 γ', batchSize: '批次大小', saveDraft: '保存本地草稿', savedDraft: '草稿已保存到当前页面', editorNote: '修改仅保留在当前浏览器会话，不会覆盖检查点或源码配置。',
    architecture: '模型架构', architectureHint: '参考网络结构', reference: '参考结构', input: '输入', backbone: '主干网络', heads: '输出分支', activation: '激活函数', parameterScale: '参数规模', architectureNote: '此架构为界面参考配置，并非从已加载的模型检查点中读取。',
  },
};

const runCopy = {
  en: {
    runOnce: 'Run once', rerun: 'Run again', stop: 'Stop run', ready: 'Ready', running: 'Running', complete: 'Complete', preview: 'Preview evaluator · no model runtime connected',
    currentStep: 'Current decision', step: 'Step', position: 'Position', heading: 'Heading', clearance: 'Nearest obstacle', action: 'Selected action', value: 'Value estimate', reward: 'Step reward', progress: 'Episode progress', decisionLog: 'Decision-step data', decisionHelp: 'Frames are generated from the preview trace at 5% intervals.',
    inputs: 'Mission inputs', inputsHelp: 'Exact world coordinates used by the current preview (1000 × 620).', waypoints: 'Navigation points', obstacles: 'Obstacles', index: '#', role: 'Role', x: 'X', y: 'Y', width: 'Width', height: 'Height', label: 'Label', home: 'Home', target: 'Target', waypoint: 'Waypoint', meters: 'world units', noFrames: 'Run the model preview to populate decision frames.',
  },
  zh: {
    runOnce: '运行一次', rerun: '再次运行', stop: '停止运行', ready: '等待运行', running: '运行中', complete: '已完成', preview: '前端预览计算器 · 未连接真实模型运行时',
    currentStep: '当前决策', step: '步骤', position: '位置', heading: '航向', clearance: '最近障碍距离', action: '选择动作', value: '价值估计', reward: '单步奖励', progress: '回合进度', decisionLog: '决策步数据', decisionHelp: '按照预览轨迹每 5% 生成一个决策帧。',
    inputs: '任务输入', inputsHelp: '当前预览使用的精确世界坐标（1000 × 620）。', waypoints: '导航点', obstacles: '障碍物', index: '序号', role: '角色', x: 'X', y: 'Y', width: '宽度', height: '高度', label: '名称', home: '起点', target: '目标', waypoint: '导航点', meters: '世界单位', noFrames: '运行模型预览后将在这里生成决策帧。',
  },
};

type ModelDraft = { name: string; description: string; learningRate: string; discount: string; batchSize: string };

const initialModelDrafts = Object.fromEntries(models.map(model => [model.id, {
  name: model.name,
  description: model.description,
  learningRate: model.params.find(param => param.label === 'Learning rate')?.value ?? '',
  discount: model.params.find(param => param.label === 'Discount γ')?.value ?? '',
  batchSize: model.params.find(param => param.label === 'Batch size')?.value ?? '',
}])) as Record<ModelId, ModelDraft>;

type ModelArchitecture = {
  input: { en: string; zh: string; shape: string };
  backbone: Array<{ en: string; zh: string; shape: string }>;
  heads: Array<{ en: string; zh: string; shape: string; detail: { en: string; zh: string } }>;
  activation: string;
  parameters: string;
};

const modelArchitectures: Record<ModelId, ModelArchitecture> = {
  dqn: {
    input: { en: 'State vector', zh: '状态向量', shape: '24' },
    backbone: [{ en: 'Dense + ReLU', zh: '全连接 + ReLU', shape: '24 → 256' }, { en: 'Dense + ReLU', zh: '全连接 + ReLU', shape: '256 → 256' }],
    heads: [{ en: 'Q-value head', zh: 'Q 值分支', shape: '256 → 8', detail: { en: '8 discrete actions', zh: '8 个离散动作' } }, { en: 'Target network', zh: '目标网络', shape: 'frozen copy', detail: { en: 'periodic synchronization', zh: '周期同步参数' } }],
    activation: 'ReLU', parameters: '≈ 75K',
  },
  ppo: {
    input: { en: 'State vector', zh: '状态向量', shape: '24' },
    backbone: [{ en: 'Shared encoder', zh: '共享编码器', shape: '24 → 256' }, { en: 'Feature layer', zh: '特征层', shape: '256 → 256' }],
    heads: [{ en: 'Policy head', zh: '策略分支', shape: '256 → 2', detail: { en: 'continuous action mean', zh: '连续动作均值' } }, { en: 'Value head', zh: '价值分支', shape: '256 → 1', detail: { en: 'state-value estimate', zh: '状态价值估计' } }],
    activation: 'Tanh', parameters: '≈ 140K',
  },
  sac: {
    input: { en: 'State + action', zh: '状态 + 动作', shape: '24 + 2' },
    backbone: [{ en: 'Actor encoder', zh: '演员编码器', shape: '24 → 256 × 2' }, { en: 'Twin critic encoders', zh: '双评论家编码器', shape: '26 → 256 × 2' }],
    heads: [{ en: 'Gaussian actor', zh: '高斯演员', shape: 'μ 2 + log σ 2', detail: { en: 'reparameterized action', zh: '重参数化动作' } }, { en: 'Critic Q1', zh: '评论家 Q1', shape: '256 → 1', detail: { en: 'independent estimate', zh: '独立价值估计' } }, { en: 'Critic Q2', zh: '评论家 Q2', shape: '256 → 1', detail: { en: 'clipped double-Q', zh: '裁剪双 Q 学习' } }],
    activation: 'ReLU', parameters: '≈ 275K',
  },
  a2c: {
    input: { en: 'State vector', zh: '状态向量', shape: '24' },
    backbone: [{ en: 'Shared encoder', zh: '共享编码器', shape: '24 → 128' }, { en: 'Feature layer', zh: '特征层', shape: '128 → 128' }],
    heads: [{ en: 'Actor head', zh: '演员分支', shape: '128 → 8', detail: { en: 'action logits', zh: '动作概率分数' } }, { en: 'Critic head', zh: '评论家分支', shape: '128 → 1', detail: { en: 'state-value estimate', zh: '状态价值估计' } }],
    activation: 'ReLU', parameters: '≈ 21K',
  },
};

const defaultObstacles: Obstacle[] = [
  { x: 225, y: 135, w: 150, h: 98, label: 'Warehouse' },
  { x: 450, y: 410, w: 128, h: 110, label: 'Restricted' },
  { x: 690, y: 315, w: 118, h: 126, label: 'Tower zone' },
];

function interpolatePath(path: Point[], progress: number) {
  const position = Math.max(0, Math.min(1, progress)) * (path.length - 1);
  const index = Math.min(path.length - 2, Math.floor(position));
  const amount = position - index;
  const start = path[index];
  const end = path[index + 1];
  return {
    point: { x: start.x + (end.x - start.x) * amount, y: start.y + (end.y - start.y) * amount },
    angle: Math.atan2(end.y - start.y, end.x - start.x),
    visible: path.slice(0, index + 1).concat({ x: start.x + (end.x - start.x) * amount, y: start.y + (end.y - start.y) * amount }),
  };
}

type DecisionFrame = { step: number; progress: number; x: number; y: number; heading: number; clearance: number; action: string; value: string; reward: string };

function previewExecutionPath(model: ModelProfile, plannedPath: Point[]) {
  const drift = { dqn: 12, ppo: 4, sac: -6, a2c: 17 }[model.id];
  return plannedPath.map((point, index) => index === 0 || index === plannedPath.length - 1 ? point : {
    x: Math.max(0, Math.min(1000, point.x + Math.cos(index * 1.37) * drift * .45)),
    y: Math.max(0, Math.min(620, point.y + Math.sin(index * 1.71) * drift)),
  });
}

function decisionFrame(model: ModelProfile, obstacles: Obstacle[], executionPath: Point[], step: number): DecisionFrame {
  const progress = Math.min(100, step * 5);
  const route = interpolatePath(executionPath, progress / 100);
  const heading = (Math.atan2(Math.sin(route.angle), Math.cos(route.angle)) * 180 / Math.PI + 360) % 360;
  const clearance = obstacles.length ? Math.min(...obstacles.map(obstacle => {
    const nearestX = Math.max(obstacle.x, Math.min(route.point.x, obstacle.x + obstacle.w));
    const nearestY = Math.max(obstacle.y, Math.min(route.point.y, obstacle.y + obstacle.h));
    return Math.hypot(route.point.x - nearestX, route.point.y - nearestY);
  })) : 999;
  const discreteActions = ['NE', 'E', 'NE', 'N', 'NE', 'E', 'N', 'NE'];
  const continuousAction = `throttle ${(0.58 + Math.sin(step * .43) * .18).toFixed(2)} · yaw ${(Math.sin(step * .71) * .24).toFixed(2)}`;
  const value = (model.success / 100 * 1.8 + progress / 100 * .65 + Math.sin(step * .51) * .06).toFixed(3);
  const reward = (1.15 + progress / 100 * 1.4 - (clearance < 50 ? 1.1 : 0) + Math.cos(step * .37) * .08).toFixed(2);
  return { step, progress, x: route.point.x, y: route.point.y, heading, clearance, action: model.id === 'dqn' || model.id === 'a2c' ? discreteActions[step % discreteActions.length] : continuousAction, value, reward };
}

function drawRoute(ctx: CanvasRenderingContext2D, points: Point[], color: string, width: number, dash: number[] = []) {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash(dash);
  ctx.stroke();
  ctx.setLineDash([]);
}

function MissionCanvas({ model, progress, zoom, locale, plannedPath, actualPath = model.path, obstacles, editing, tool, selection, onSelect, onAddWaypoint, onAddObstacle, onMoveSelection }: {
  model: ModelProfile;
  progress: number;
  zoom: number;
  locale: Locale;
  plannedPath: Point[];
  actualPath?: Point[];
  obstacles: Obstacle[];
  editing: boolean;
  tool: LayoutTool;
  selection: LayoutSelection;
  onSelect: (selection: LayoutSelection) => void;
  onAddWaypoint: (point: Point) => void;
  onAddObstacle: (point: Point) => void;
  onMoveSelection: (selection: Exclude<LayoutSelection, null>, point: Point) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ selection: Exclude<LayoutSelection, null>; offset: Point } | null>(null);
  const text = copy[locale];

  const worldPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const bounds = canvas.getBoundingClientRect();
    const world = { width: 1000, height: 620 };
    const baseScale = Math.min((bounds.width - 48) / world.width, (bounds.height - 48) / world.height);
    const scale = baseScale * zoom;
    const offsetX = (bounds.width - world.width * scale) / 2;
    const offsetY = (bounds.height - world.height * scale) / 2;
    return {
      x: Math.max(0, Math.min(world.width, (event.clientX - bounds.left - offsetX) / scale)),
      y: Math.max(0, Math.min(world.height, (event.clientY - bounds.top - offsetY) / scale)),
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!editing) return;
    const point = worldPoint(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (tool === 'waypoint') { onAddWaypoint(point); return; }
    if (tool === 'obstacle') { onAddObstacle(point); return; }

    const waypointIndex = plannedPath.findIndex(candidate => Math.hypot(candidate.x - point.x, candidate.y - point.y) <= 24);
    if (waypointIndex >= 0) {
      const next = { kind: 'waypoint' as const, index: waypointIndex };
      onSelect(next);
      dragRef.current = { selection: next, offset: { x: 0, y: 0 } };
      return;
    }
    let obstacleIndex = -1;
    for (let index = obstacles.length - 1; index >= 0; index -= 1) {
      const obstacle = obstacles[index];
      if (point.x >= obstacle.x && point.x <= obstacle.x + obstacle.w && point.y >= obstacle.y && point.y <= obstacle.y + obstacle.h) { obstacleIndex = index; break; }
    }
    if (obstacleIndex >= 0) {
      const obstacle = obstacles[obstacleIndex];
      const next = { kind: 'obstacle' as const, index: obstacleIndex };
      onSelect(next);
      dragRef.current = { selection: next, offset: { x: point.x - obstacle.x, y: point.y - obstacle.y } };
      return;
    }
    onSelect(null);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!editing || !dragRef.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const point = worldPoint(event);
    if (!point) return;
    onMoveSelection(dragRef.current.selection, { x: point.x - dragRef.current.offset.x, y: point.y - dragRef.current.offset.y });
  };

  const stopDragging = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * ratio);
      canvas.height = Math.round(bounds.height * ratio);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, bounds.width, bounds.height);

      const world = { width: 1000, height: 620 };
      const baseScale = Math.min((bounds.width - 48) / world.width, (bounds.height - 48) / world.height);
      const scale = baseScale * zoom;
      const offsetX = (bounds.width - world.width * scale) / 2;
      const offsetY = (bounds.height - world.height * scale) / 2;
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      ctx.fillStyle = '#101a1c';
      ctx.fillRect(0, 0, world.width, world.height);
      ctx.strokeStyle = 'rgba(133, 176, 171, .08)';
      ctx.lineWidth = 1 / scale;
      for (let x = 0; x <= world.width; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, world.height); ctx.stroke(); }
      for (let y = 0; y <= world.height; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(world.width, y); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(167, 208, 199, .22)';
      for (let x = 0; x <= world.width; x += 250) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, world.height); ctx.stroke(); }
      for (let y = 0; y <= world.height; y += 250) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(world.width, y); ctx.stroke(); }

      ctx.font = '500 14px Inter, system-ui, sans-serif';
      obstacles.forEach((obstacle, index) => {
        ctx.fillStyle = 'rgba(238, 119, 102, .12)';
        ctx.strokeStyle = selection?.kind === 'obstacle' && selection.index === index ? '#ffcf72' : 'rgba(238, 119, 102, .58)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 7]);
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
        ctx.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255, 187, 174, .72)';
        ctx.fillText(locale === 'zh' ? (text.obstacles[index] ?? obstacle.label) : obstacle.label.toUpperCase(), obstacle.x + 12, obstacle.y + 24);
      });

      drawRoute(ctx, plannedPath, 'rgba(213, 231, 224, .30)', 4, [14, 12]);
      const route = interpolatePath(actualPath, progress / 100);
      drawRoute(ctx, actualPath, 'rgba(255,255,255,.08)', 7);
      drawRoute(ctx, route.visible, model.color, 8);

      plannedPath.slice(1, -1).forEach((point, index) => {
        ctx.beginPath(); ctx.arc(point.x, point.y, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#101a1c'; ctx.fill(); ctx.strokeStyle = selection?.kind === 'waypoint' && selection.index === index + 1 ? '#ffcf72' : 'rgba(210,229,222,.65)'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#bdcec8'; ctx.font = '600 12px Inter, system-ui, sans-serif'; ctx.fillText(String(index + 1), point.x + 15, point.y + 4);
      });

      const start = plannedPath[0];
      ctx.beginPath(); ctx.arc(start.x, start.y, 13, 0, Math.PI * 2); ctx.fillStyle = '#101a1c'; ctx.fill(); ctx.strokeStyle = selection?.kind === 'waypoint' && selection.index === 0 ? '#ffcf72' : '#b4c8c0'; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = '#b4c8c0'; ctx.font = '600 14px Inter, system-ui, sans-serif'; ctx.fillText(text.home, start.x - 22, start.y + 34);

      const target = plannedPath.at(-1)!;
      ctx.beginPath(); ctx.arc(target.x, target.y, 25, 0, Math.PI * 2); ctx.fillStyle = 'rgba(116,211,174,.12)'; ctx.fill();
      ctx.beginPath(); ctx.arc(target.x, target.y, 13, 0, Math.PI * 2); ctx.strokeStyle = selection?.kind === 'waypoint' && selection.index === plannedPath.length - 1 ? '#ffcf72' : '#74d3ae'; ctx.lineWidth = 4; ctx.stroke();
      ctx.beginPath(); ctx.arc(target.x, target.y, 4, 0, Math.PI * 2); ctx.fillStyle = '#74d3ae'; ctx.fill();
      ctx.fillStyle = '#bdeedb'; ctx.font = '600 14px Inter, system-ui, sans-serif'; ctx.fillText(text.target, target.x - 27, target.y + 48);

      ctx.save();
      ctx.translate(route.point.x, route.point.y);
      ctx.rotate(route.angle);
      const cone = ctx.createLinearGradient(0, 0, 120, 0);
      cone.addColorStop(0, `${model.color}40`); cone.addColorStop(1, `${model.color}00`);
      ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(125, -58); ctx.lineTo(125, 58); ctx.closePath(); ctx.fillStyle = cone; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI * 2); ctx.fillStyle = '#0b1214'; ctx.fill(); ctx.strokeStyle = model.color; ctx.lineWidth = 5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(23, 0); ctx.lineTo(-14, -17); ctx.lineTo(-7, 0); ctx.lineTo(-14, 17); ctx.closePath(); ctx.fillStyle = model.color; ctx.fill();
      ctx.restore();

      ctx.strokeStyle = 'rgba(197, 220, 211, .7)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(35, 576); ctx.lineTo(135, 576); ctx.stroke();
      ctx.fillStyle = 'rgba(197, 220, 211, .72)'; ctx.font = '500 13px Inter, system-ui, sans-serif'; ctx.fillText('100 m', 58, 600);
      ctx.restore();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [actualPath, locale, model, obstacles, plannedPath, progress, selection, text, zoom]);

  return <canvas ref={canvasRef} className={`mission-canvas${editing ? ' is-editing' : ''}`} aria-label={text.mapAria(model.name)} data-layout-tool={tool} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={stopDragging} onPointerCancel={stopDragging} />;
}

function RunWorkspace({ locale, model, modelId, onModelChange, progress, running, hasRun, onRun, onStop, plannedPath, obstacles, onWaypointChange, onObstacleChange }: {
  locale: Locale;
  model: ModelProfile;
  modelId: ModelId;
  onModelChange: (id: ModelId) => void;
  progress: number;
  running: boolean;
  hasRun: boolean;
  onRun: () => void;
  onStop: () => void;
  plannedPath: Point[];
  obstacles: Obstacle[];
  onWaypointChange: (index: number, key: keyof Point, value: number) => void;
  onObstacleChange: (index: number, key: keyof Obstacle, value: string | number) => void;
}) {
  const text = runCopy[locale];
  const executionPath = useMemo(() => previewExecutionPath(model, plannedPath), [model, plannedPath]);
  const frames = hasRun ? Array.from({ length: Math.min(21, Math.floor(progress / 5) + 1) }, (_, index) => decisionFrame(model, obstacles, executionPath, index)) : [];
  const current = frames.at(-1) ?? null;
  const status = running ? text.running : hasRun && progress >= 100 ? text.complete : text.ready;

  return <section className="workspace-page run-workspace">
    <section className="run-control-card">
      <label><span>{workspaceCopy[locale].policyModel}</span><select value={modelId} disabled={running} onChange={event => onModelChange(event.target.value as ModelId)}>{models.map(item => <option key={item.id} value={item.id}>{item.name} · {locale === 'zh' ? modelChinese[item.id].family : item.family}</option>)}</select></label>
      <div className={`run-status status-${running ? 'running' : hasRun && progress >= 100 ? 'complete' : 'ready'}`}><i /><span>{status}<small>{text.preview}</small></span></div>
      <button type="button" className="run-once-button" onClick={running ? onStop : onRun}>{running ? <Pause size={16} /> : <Play size={16} />}{running ? text.stop : hasRun ? text.rerun : text.runOnce}</button>
    </section>

    <div className="run-map-grid">
      <div className="map-card run-map-card"><MissionCanvas model={model} progress={progress} zoom={1} locale={locale} plannedPath={plannedPath} actualPath={executionPath} obstacles={obstacles} editing={false} tool="select" selection={null} onSelect={() => {}} onAddWaypoint={() => {}} onAddObstacle={() => {}} onMoveSelection={() => {}} /></div>
      <aside className="decision-current">
        <header><small>{text.currentStep}</small><strong>{current ? `#${String(current.step).padStart(2, '0')}` : '—'}</strong></header>
        <dl><div><dt>{text.position}</dt><dd>{current ? `${current.x.toFixed(1)}, ${current.y.toFixed(1)}` : '—'}</dd></div><div><dt>{text.heading}</dt><dd>{current ? `${current.heading.toFixed(1)}°` : '—'}</dd></div><div><dt>{text.clearance}</dt><dd>{current ? `${current.clearance.toFixed(1)} u` : '—'}</dd></div><div><dt>{text.action}</dt><dd>{current?.action ?? '—'}</dd></div><div><dt>{text.value}</dt><dd>{current?.value ?? '—'}</dd></div><div><dt>{text.reward}</dt><dd>{current?.reward ?? '—'}</dd></div></dl>
        <div className="run-progress"><span><small>{text.progress}</small><strong>{Math.round(progress)}%</strong></span><div><i style={{ width: `${progress}%`, background: model.color }} /></div></div>
      </aside>
    </div>

    <section className="decision-log">
      <div className="section-heading"><div><small>{text.step}</small><h2>{text.decisionLog}</h2></div><p>{text.decisionHelp}</p></div>
      {frames.length ? <div className="data-table-wrap"><table><thead><tr><th>{text.step}</th><th>{text.position}</th><th>{text.heading}</th><th>{text.clearance}</th><th>{text.action}</th><th>{text.value}</th><th>{text.reward}</th></tr></thead><tbody>{[...frames].reverse().map(frame => <tr key={frame.step} className={frame.step === current?.step ? 'is-current' : ''}><td>#{String(frame.step).padStart(2, '0')}</td><td>{frame.x.toFixed(1)}, {frame.y.toFixed(1)}</td><td>{frame.heading.toFixed(1)}°</td><td>{frame.clearance.toFixed(1)} u</td><td>{frame.action}</td><td>{frame.value}</td><td>{frame.reward}</td></tr>)}</tbody></table></div> : <p className="empty-data">{text.noFrames}</p>}
    </section>

    <section className="mission-inputs">
      <div className="section-heading"><div><small>1000 × 620</small><h2>{text.inputs}</h2></div><p>{text.inputsHelp}</p></div>
      <div className="input-tables">
        <div><h3>{text.waypoints}</h3><div className="data-table-wrap"><table><thead><tr><th>{text.index}</th><th>{text.role}</th><th>{text.x}</th><th>{text.y}</th></tr></thead><tbody>{plannedPath.map((point, index) => <tr key={`waypoint-${index}`}><td>{index}</td><td>{index === 0 ? text.home : index === plannedPath.length - 1 ? text.target : `${text.waypoint} ${index}`}</td><td><input aria-label={`${text.waypoint} ${index} X`} type="number" min="0" max="1000" value={Math.round(point.x)} onChange={event => onWaypointChange(index, 'x', Number(event.target.value))} /></td><td><input aria-label={`${text.waypoint} ${index} Y`} type="number" min="0" max="620" value={Math.round(point.y)} onChange={event => onWaypointChange(index, 'y', Number(event.target.value))} /></td></tr>)}</tbody></table></div></div>
        <div><h3>{text.obstacles}</h3><div className="data-table-wrap"><table><thead><tr><th>{text.index}</th><th>{text.label}</th><th>{text.x}</th><th>{text.y}</th><th>{text.width}</th><th>{text.height}</th></tr></thead><tbody>{obstacles.map((obstacle, index) => <tr key={`obstacle-${index}`}><td>{index}</td><td><input aria-label={`${text.obstacles} ${index} ${text.label}`} value={obstacle.label} onChange={event => onObstacleChange(index, 'label', event.target.value)} /></td>{(['x', 'y', 'w', 'h'] as const).map(key => <td key={key}><input aria-label={`${text.obstacles} ${index} ${key}`} type="number" min="0" value={Math.round(obstacle[key])} onChange={event => onObstacleChange(index, key, Number(event.target.value))} /></td>)}</tr>)}</tbody></table></div></div>
      </div>
    </section>
  </section>;
}

function TrainingWorkspace({ locale, modelId, onModelChange }: { locale: Locale; modelId: ModelId; onModelChange: (id: ModelId) => void }) {
  const text = workspaceCopy[locale];
  const [saved, setSaved] = useState(false);
  const [configuration, setConfiguration] = useState({ environment: 'DroneRanger-Urban-v1', timesteps: '2000000', parallel: '8', seed: '24', device: 'Auto' });
  const update = (key: keyof typeof configuration, value: string) => {
    setConfiguration(current => ({ ...current, [key]: value }));
    setSaved(false);
  };

  return <section className="workspace-page training-workspace">
    <div className="workspace-page-heading"><div><small>{text.training}</small><h1>{text.trainingTitle}</h1><p>{text.trainingLead}</p></div><Settings2 aria-hidden="true" /></div>
    <div className="workspace-columns">
      <form className="workspace-form" onSubmit={event => { event.preventDefault(); setSaved(true); }}>
        <h2>{text.runSetup}</h2>
        <div className="form-grid">
          <label><span>{text.policyModel}</span><select value={modelId} onChange={event => onModelChange(event.target.value as ModelId)}>{models.map(item => <option key={item.id} value={item.id}>{item.name} · {locale === 'zh' ? modelChinese[item.id].family : item.family}</option>)}</select></label>
          <label><span>{text.environment}</span><select value={configuration.environment} onChange={event => update('environment', event.target.value)}><option>DroneRanger-Urban-v1</option><option>DroneRanger-OpenField-v1</option><option>DroneRanger-Obstacle-v2</option></select></label>
          <label><span>{text.timesteps}</span><input type="number" min="1000" step="1000" value={configuration.timesteps} onChange={event => update('timesteps', event.target.value)} /></label>
          <label><span>{text.parallelEnvs}</span><input type="number" min="1" max="64" value={configuration.parallel} onChange={event => update('parallel', event.target.value)} /></label>
          <label><span>{text.seed}</span><input type="number" value={configuration.seed} onChange={event => update('seed', event.target.value)} /></label>
          <label><span>{text.device}</span><select value={configuration.device} onChange={event => update('device', event.target.value)}><option>Auto</option><option>CPU</option><option>CUDA</option><option>MPS</option></select></label>
        </div>
        <div className="form-actions"><button type="submit"><Save size={15} />{saved ? text.savedConfig : text.saveConfig}</button><p>{text.backendNote}</p></div>
      </form>
      <aside className="run-summary">
        <div className="summary-heading"><span className="model-monogram" style={{ background: models.find(item => item.id === modelId)?.softColor, color: models.find(item => item.id === modelId)?.color }}>{modelId.slice(0, 1).toUpperCase()}</span><div><small>{text.runSummary}</small><h2>{modelId.toUpperCase()}</h2></div></div>
        <dl><div><dt>{text.environment}</dt><dd>{configuration.environment}</dd></div><div><dt>{text.estimated}</dt><dd>{Number(configuration.timesteps || 0).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')} steps</dd></div><div><dt>{text.rollout}</dt><dd>{configuration.parallel} × env</dd></div><div><dt>{text.reproducible}</dt><dd>#{configuration.seed}</dd></div></dl>
        <span className="local-badge">{text.localOnly}</span>
      </aside>
    </div>
  </section>;
}

function ArchitecturePanel({ locale, modelId }: { locale: Locale; modelId: ModelId }) {
  const text = workspaceCopy[locale];
  const architecture = modelArchitectures[modelId];
  const model = models.find(item => item.id === modelId) ?? models[0];
  const localized = (value: { en: string; zh: string }) => value[locale];

  return <section className="architecture-panel" style={{ '--architecture-color': model.color, '--architecture-soft': model.softColor } as React.CSSProperties}>
    <header><div><small>{text.architectureHint}</small><h2>{text.architecture}</h2></div><span>{text.reference}</span></header>
    <div className="architecture-flow" aria-label={`${model.name} ${text.architecture}`}>
      <article className="architecture-node input-node"><small>{text.input}</small><strong>{localized(architecture.input)}</strong><code>{architecture.input.shape}</code></article>
      <i className="architecture-connector" aria-hidden="true" />
      <div className="architecture-stack"><small>{text.backbone}</small>{architecture.backbone.map((layer, index) => <article key={`${layer.en}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{localized(layer)}</strong><code>{layer.shape}</code></div></article>)}</div>
      <i className="architecture-connector" aria-hidden="true" />
      <div className="architecture-heads"><small>{text.heads}</small>{architecture.heads.map(head => <article key={head.en}><span /><div><strong>{localized(head)}</strong><code>{head.shape}</code><small>{localized(head.detail)}</small></div></article>)}</div>
    </div>
    <dl className="architecture-facts"><div><dt>{text.activation}</dt><dd>{architecture.activation}</dd></div><div><dt>{text.parameterScale}</dt><dd>{architecture.parameters}</dd></div></dl>
    <p className="architecture-note">{text.architectureNote}</p>
  </section>;
}

function ModelWorkspace({ locale, modelId, onModelChange, drafts, onDraftChange }: { locale: Locale; modelId: ModelId; onModelChange: (id: ModelId) => void; drafts: Record<ModelId, ModelDraft>; onDraftChange: (id: ModelId, draft: ModelDraft) => void }) {
  const text = workspaceCopy[locale];
  const draft = drafts[modelId];
  const [saved, setSaved] = useState(false);
  const update = (key: keyof ModelDraft, value: string) => {
    onDraftChange(modelId, { ...draft, [key]: value });
    setSaved(false);
  };

  return <section className="workspace-page model-workspace">
    <div className="workspace-page-heading"><div><small>{text.models}</small><h1>{text.editorTitle}</h1><p>{text.editorLead}</p></div><PencilRuler aria-hidden="true" /></div>
    <div className="editor-layout">
      <ArchitecturePanel locale={locale} modelId={modelId} />
      <form className="workspace-form model-form" onSubmit={event => { event.preventDefault(); setSaved(true); }}>
        <div className="form-title"><div><small>{text.profile}</small><h2>{modelId.toUpperCase()}</h2></div><label className="model-select-field"><span>{text.modelLibrary}</span><select value={modelId} onChange={event => { onModelChange(event.target.value as ModelId); setSaved(false); }}>{models.map(item => <option key={item.id} value={item.id}>{drafts[item.id].name} · {locale === 'zh' ? modelChinese[item.id].family : item.family}</option>)}</select></label><span className="local-badge">{text.localOnly}</span></div>
        <div className="form-grid">
          <label className="wide-field"><span>{text.displayName}</span><input value={draft.name} onChange={event => update('name', event.target.value)} /></label>
          <label className="wide-field"><span>{text.description}</span><textarea rows={4} value={draft.description} onChange={event => update('description', event.target.value)} /></label>
          <label><span>{text.learningRate}</span><input value={draft.learningRate} onChange={event => update('learningRate', event.target.value)} /></label>
          <label><span>{text.discount}</span><input value={draft.discount} onChange={event => update('discount', event.target.value)} /></label>
          <label><span>{text.batchSize}</span><input type="number" min="1" value={draft.batchSize} onChange={event => update('batchSize', event.target.value)} /></label>
        </div>
        <div className="form-actions"><button type="submit"><Save size={15} />{saved ? text.savedDraft : text.saveDraft}</button><p>{text.editorNote}</p></div>
      </form>
    </div>
  </section>;
}

export function DroneRangerDashboard() {
  const [page, setPage] = useState<WorkspacePage>('run');
  const [modelId, setModelId] = useState<ModelId>('dqn');
  const [modelDrafts, setModelDrafts] = useState<Record<ModelId, ModelDraft>>(initialModelDrafts);
  const [plannedPath, setPlannedPath] = useState<Point[]>(() => defaultPlannedPath.map(point => ({ ...point })));
  const [obstacles, setObstacles] = useState<Obstacle[]>(() => defaultObstacles.map(obstacle => ({ ...obstacle })));
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [locale, setLocale] = useState<Locale>(() => {
    try { return window.localStorage.getItem('drone-ranger.locale.v1') === 'zh' ? 'zh' : 'en'; } catch { return 'en'; }
  });
  const model = useMemo(() => models.find(item => item.id === modelId) ?? models[0], [modelId]);
  const text = copy[locale];
  const workspaceText = workspaceCopy[locale];

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setProgress(value => Math.min(100, value + 0.5)), 50);
    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    if (playing && progress >= 100) setPlaying(false);
  }, [playing, progress]);

  const chooseLocale = (next: Locale) => {
    setLocale(next);
    try { window.localStorage.setItem('drone-ranger.locale.v1', next); } catch { /* Optional preference storage. */ }
  };

  return <div className="drone-dashboard" data-page-region="drone-ranger-dashboard" lang={locale === 'zh' ? 'zh-CN' : 'en'}>
    <div className="language-switch" aria-label={text.language}>
      <Globe2 size={14} aria-hidden="true" />
      <button type="button" className={locale === 'zh' ? 'is-active' : ''} aria-pressed={locale === 'zh'} onClick={() => chooseLocale('zh')}>中文</button>
      <span />
      <button type="button" className={locale === 'en' ? 'is-active' : ''} aria-pressed={locale === 'en'} onClick={() => chooseLocale('en')}>EN</button>
    </div>
    <section className="drone-hero">
      <nav className="workspace-navigation" aria-label={workspaceText.navigation}>
        <button type="button" className={page === 'run' ? 'is-active' : ''} aria-current={page === 'run' ? 'page' : undefined} onClick={() => { setPage('run'); setPlaying(false); }}><Activity size={17} /><span><strong>{workspaceText.run}</strong><small>{workspaceText.runHint}</small></span></button>
        <button type="button" className={page === 'training' ? 'is-active' : ''} aria-current={page === 'training' ? 'page' : undefined} onClick={() => { setPage('training'); setPlaying(false); }}><Settings2 size={17} /><span><strong>{workspaceText.training}</strong><small>{workspaceText.trainingHint}</small></span></button>
        <button type="button" className={page === 'models' ? 'is-active' : ''} aria-current={page === 'models' ? 'page' : undefined} onClick={() => { setPage('models'); setPlaying(false); }}><PencilRuler size={17} /><span><strong>{workspaceText.models}</strong><small>{workspaceText.modelsHint}</small></span></button>
      </nav>
      <div className="mission-state"><span /><div><small>{page === 'run' ? workspaceText.runStatus : page === 'training' ? workspaceText.trainingStatus : workspaceText.modelStatus}</small><strong>{page === 'run' ? workspaceText.runState : page === 'training' ? workspaceText.trainingState : workspaceText.modelState}</strong></div></div>
    </section>

    {page === 'run' && <RunWorkspace
      locale={locale}
      model={model}
      modelId={modelId}
      onModelChange={id => { setModelId(id); setProgress(0); setHasRun(false); setPlaying(false); }}
      progress={progress}
      running={playing && hasRun}
      hasRun={hasRun}
      onRun={() => { setProgress(0); setHasRun(true); setPlaying(true); }}
      onStop={() => setPlaying(false)}
      plannedPath={plannedPath}
      obstacles={obstacles}
      onWaypointChange={(index, key, value) => {
        if (!Number.isFinite(value)) return;
        const maximum = key === 'x' ? 1000 : 620;
        setPlannedPath(current => current.map((point, pointIndex) => pointIndex === index ? { ...point, [key]: Math.max(0, Math.min(maximum, value)) } : point));
      }}
      onObstacleChange={(index, key, value) => {
        setObstacles(current => current.map((obstacle, obstacleIndex) => {
          if (obstacleIndex !== index) return obstacle;
          if (key === 'label') return { ...obstacle, label: String(value) };
          const numeric = Number(value);
          if (!Number.isFinite(numeric)) return obstacle;
          if (key === 'w') {
            const w = Math.max(40, Math.min(320, numeric));
            return { ...obstacle, w, x: Math.min(obstacle.x, 1000 - w) };
          }
          if (key === 'h') {
            const h = Math.max(40, Math.min(240, numeric));
            return { ...obstacle, h, y: Math.min(obstacle.y, 620 - h) };
          }
          const maximum = key === 'x' ? 1000 - obstacle.w : 620 - obstacle.h;
          return { ...obstacle, [key]: Math.max(0, Math.min(maximum, numeric)) };
        }));
      }}
    />}

    {page === 'training' && <TrainingWorkspace locale={locale} modelId={modelId} onModelChange={setModelId} />}
    {page === 'models' && <ModelWorkspace locale={locale} modelId={modelId} onModelChange={setModelId} drafts={modelDrafts} onDraftChange={(id, draft) => setModelDrafts(current => ({ ...current, [id]: draft }))} />}
  </div>;
}
