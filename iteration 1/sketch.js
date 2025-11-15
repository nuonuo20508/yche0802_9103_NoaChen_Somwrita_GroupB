// 画笔选项、基础尺寸和缩放变量
let strokeOption;
let baseSize;
let scale;
let canvas = 800; // 基础画布大小

// 音频相关变量
let amplitude;        // 音频振幅分析器
let soundFile;        // 音频/视频文件对象
let isPlaying = false;    // 是否正在播放
let hasUploadedAudio = false; // 是否已上传音频文件
let isVideo = false;        // 是否为视频文件
let audioStarted = false;   // 音频上下文是否已启动

// 麦克风相关变量
let mic;               // 麦克风输入对象
let isUsingMic = false;    // 是否正在使用麦克风
let micStarted = false;    // 麦克风是否已启动

// Web Audio API 相关变量（用于视频音频分析）
let audioContext;      // 音频上下文
let analyser;          // 音频分析器
let source;            // 音频源

// 根据当前窗口大小调整画笔粗细和缩放比例
function adjustStrokeAndScale() {

  baseSize = min(windowWidth, windowHeight);
  // 计算相对于基础画布大小的缩放比例
  scale = baseSize / canvas;
  // 美观线条图案的基础画笔粗细
  strokeOption = [0.4, 0.8, 1, 2, 3.5];

  for (let i = 0; i < strokeOption.length; i++) {
    strokeOption[i] *= scale;
  }
}

// 绘制一组30度倾斜的平行线，位置随机
// 音频响应：参数根据声音振幅变化
function drawLineGroup() {
  // 获取当前音频电平（0到1）
  let level = amplitude ? amplitude.getLevel() : 0;

  // 将音频电平映射到视觉参数
  // 音量越大 = 线条越多、线条越长、间距越密
  let minLines = map(level, 0, 1, 5, 15);
  let maxLines = map(level, 0, 1, 15, 50);
  let minLength = map(level, 0, 1, 50, 150) * scale;
  let maxLength = map(level, 0, 1, 150, 300) * scale;
  let minSpacing = map(level, 0, 1, 2, 6);
  let maxSpacing = map(level, 0, 1, 6, 12);

  // 随机选择起始点（x1, y1）
  // 原点在画布中心
  const x1 = random(-width / 2, width / 2);
  const y1 = random(-height / 2, height / 2);
  // 确定水平和垂直方向偏移
  // 使用三元运算符
  const signX = random() > 0.5 ? 1 : -1;
  const signY = random() > 0.5 ? 1 : -1;
  // 使用音频映射的线条长度
  const lineLength = random(minLength, maxLength);
  // 30度倾斜
  const angle = tan(30);
  // 水平和垂直偏移
  const hShift = lineLength * signX;
  const vShift = lineLength * angle * signY;
  // 线条终点（x2, y2）
  const x2 = x1 + hShift;
  const y2 = y1 + vShift;
  // 使用音频映射的线条数量和间距
  const numLines = floor(random(minLines, maxLines));
  const spacing = random(minSpacing, maxSpacing);

  // 绘制每条线，带有垂直偏移
  for (let i = 0; i < numLines; i++) {
    const offset = i * spacing; // 组内每条线的相对偏移
    strokeWeight(random(strokeOption)); // 每条线的画笔粗细
    // 当前线的y坐标
    let Y1 = y1 + offset;
    let Y2 = y2 + offset;

    line(x1, Y1, x2, Y2);
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);

  adjustStrokeAndScale();

  // 初始化音频
  amplitude = new p5.Amplitude();
  amplitude.smooth(0.8); // 平滑振幅读数

  // 以振荡器作为后备
  soundFile = new p5.Oscillator();
  soundFile.amp(0);
  soundFile.start();

  // 设置文件上传处理器
  setupFileUpload();

  background(247, 241, 219);
  // 将原点移动到画布中心
  translate(width / 2, height / 2);
}

function setupFileUpload() {
  let fileInput = document.getElementById('audioFile');
  let fileNameDiv = document.getElementById('fileName');
  let startAudioBtn = document.getElementById('startAudio');
  let playPauseBtn = document.getElementById('playPauseBtn');

  fileInput.addEventListener('change', function(e) {
    let file = e.target.files[0];
    if (file) {
      // 检查文件大小（对大视频文件发出警告）
      let fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 100) {
        fileNameDiv.textContent = '警告: 文件较大 (' + fileSizeMB.toFixed(1) + 'MB)，加载可能需要时间';
        fileNameDiv.style.color = 'orange';
      }

      // 确定文件类型
      let fileExtension = file.name.split('.').pop().toLowerCase();
      let audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'];
      let videoExtensions = ['mp4', 'avi', 'mov', 'mkv', 'webm'];

      if (!audioExtensions.includes(fileExtension) && !videoExtensions.includes(fileExtension)) {
        fileNameDiv.textContent = '错误: 不支持的文件格式';
        fileNameDiv.style.color = 'red';
        return;
      }

      fileNameDiv.textContent = '正在加载: ' + file.name;
      fileNameDiv.style.color = '#333';

      // 停止当前的声音/视频
      if (soundFile) {
        soundFile.stop();
      }

      // 为上传的文件创建URL
      let fileURL = URL.createObjectURL(file);

      // 根据文件类型加载
      if (videoExtensions.includes(fileExtension)) {
        // 作为视频加载
        soundFile = createVideo(fileURL, function() {
          console.log('视频文件加载成功!');
          fileNameDiv.textContent = '已加载: ' + file.name + ' (视频) ✓';
          fileNameDiv.style.color = 'green';
          hasUploadedAudio = true;
          isVideo = true;

          // 隐藏视频元素
          soundFile.hide();

          // 设置音量但暂不播放
          soundFile.volume(1.0);

          // 隐藏启动音频按钮
          startAudioBtn.style.display = 'none';
          playPauseBtn.style.display = 'block';
          playPauseBtn.disabled = false;
          playPauseBtn.style.background = '#4CAF50';
          playPauseBtn.style.color = 'white';
          playPauseBtn.style.cursor = 'pointer';
          fileNameDiv.textContent += ' - 请点击"启动音频权限"';

          // 为视频音频分析初始化 Web Audio API
          audioContext = getAudioContext();
          analyser = audioContext.createAnalyser();
          source = audioContext.createMediaElementSource(soundFile.elt);
          source.connect(analyser);
          analyser.connect(audioContext.destination);

        }, function(error) {
          console.error('视频文件加载失败:', error);
          fileNameDiv.textContent = '加载失败: 请检查视频文件格式';
          fileNameDiv.style.color = 'red';
          resetToFallback();
        });
      } else {
        // 作为音频加载
        soundFile = loadSound(fileURL, function() {
          console.log('音频文件加载成功!');
          fileNameDiv.textContent = '已加载: ' + file.name + ' (音频) ✓';
          fileNameDiv.style.color = 'green';
          hasUploadedAudio = true;
          isVideo = false;

          // 隐藏启动音频按钮
          startAudioBtn.style.display = 'none';
          playPauseBtn.style.display = 'block';
          playPauseBtn.disabled = false;
          playPauseBtn.style.background = '#4CAF50';
          playPauseBtn.style.color = 'white';
          playPauseBtn.style.cursor = 'pointer';
          fileNameDiv.textContent += ' - 请点击"启动音频权限"';

        }, function(error) {
          console.error('音频文件加载失败:', error);
          fileNameDiv.textContent = '加载失败: 请检查音频文件格式';
          fileNameDiv.style.color = 'red';
          resetToFallback();
        });
      }
    }
  });
}

// 用户启动音频上下文（浏览器要求）
function userStartAudio() {
  console.log('userStartAudio called, current state:', getAudioContext().state);

  // 如果音频上下文未运行，则恢复
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume().then(() => {
      console.log('音频上下文已启动');
      audioStarted = true;

      // 重要：音频上下文恢复后重新连接振幅分析器
      // 仅适用于音频文件，不适用于视频（视频使用 Web Audio API 分析器）
      if (soundFile && amplitude && !isVideo) {
        amplitude.setInput(soundFile);
        console.log('音频分析器已重新连接到音频文件');
      }

      // 调试：检查视频是否有音频轨道
      if (isVideo && soundFile.elt) {
        console.log('视频音频轨道数量:', soundFile.elt.audioTracks ? soundFile.elt.audioTracks.length : '无法检测');
      }
    }).catch(err => {
      console.error('音频上下文启动失败:', err);
    });
  } else {
    console.log('音频上下文已经在运行中');
    audioStarted = true;

    if (soundFile && amplitude && !isVideo) {
      amplitude.setInput(soundFile);
      console.log('音频分析器已重新连接到音频文件');
    }
  }

  // 始终隐藏启动音频按钮并更新显示
  document.getElementById('startAudio').style.display = 'none';

  // 更新文件名显示
  let fileNameDiv = document.getElementById('fileName');
  if (fileNameDiv.textContent.includes('请点击')) {
    fileNameDiv.textContent = fileNameDiv.textContent.replace(' - 请点击"启动音频权限"', ' - 音频已启动 ✓');
  }
}

function resetToFallback() {
  // 回退到振荡器
  soundFile = new p5.Oscillator();
  soundFile.amp(0);
  soundFile.start();
  hasUploadedAudio = false;
  isVideo = false;
}

// 切换麦克风输入
function toggleMicrophone() {
  let micBtn = document.getElementById('micBtn');
  let fileNameDiv = document.getElementById('fileName');
  let playPauseBtn = document.getElementById('playPauseBtn');
  let startAudioBtn = document.getElementById('startAudio');

  if (!isUsingMic) {
    // 启动麦克风
    startMicrophone();
  } else {
    // 停止麦克风并切换回文件模式
    stopMicrophone();
  }
}

function startMicrophone() {
  let micBtn = document.getElementById('micBtn');
  let fileNameDiv = document.getElementById('fileName');
  let playPauseBtn = document.getElementById('playPauseBtn');
  let startAudioBtn = document.getElementById('startAudio');

  // 首先停止任何正在播放的音频/视频
  if (soundFile && isPlaying) {
    if (isVideo) {
      soundFile.pause();
    } else {
      soundFile.stop();
    }
    isPlaying = false;
  }

  // 隐藏文件模式的播放/暂停按钮
  playPauseBtn.style.display = 'none';

  // 如果需要，启动音频上下文
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume().then(() => {
      console.log('音频上下文已启动（麦克风模式）');
      audioStarted = true;
      initializeMicrophone();
    }).catch(err => {
      console.error('音频上下文启动失败:', err);
      fileNameDiv.textContent = '麦克风启动失败: ' + err.message;
      fileNameDiv.style.color = 'red';
    });
  } else {
    audioStarted = true;
    initializeMicrophone();
  }
}

function initializeMicrophone() {
  let micBtn = document.getElementById('micBtn');
  let fileNameDiv = document.getElementById('fileName');

  // 创建并启动麦克风
  mic = new p5.AudioIn();
  mic.start(() => {
    console.log('麦克风已启动');
    micStarted = true;
    isUsingMic = true;
    
    // 将麦克风连接到振幅分析器
    amplitude.setInput(mic);
    
    // 更新UI
    micBtn.textContent = '🔴 停止麦克风';
    micBtn.style.background = '#F44336';
    fileNameDiv.textContent = '麦克风已启动 - 正在监听声音...';
    fileNameDiv.style.color = 'green';
    
    // 开始播放可视化
    isPlaying = true;
    
  }, (error) => {
    console.error('麦克风启动失败:', error);
    fileNameDiv.textContent = '麦克风启动失败: 请检查麦克风权限';
    fileNameDiv.style.color = 'red';
  });
}

function stopMicrophone() {
  let micBtn = document.getElementById('micBtn');
  let fileNameDiv = document.getElementById('fileName');
  let playPauseBtn = document.getElementById('playPauseBtn');

  if (mic && micStarted) {
    mic.stop();
    micStarted = false;
  }

  isUsingMic = false;
  isPlaying = false;

  // 重置振幅输入
  if (soundFile && !isVideo) {
    amplitude.setInput(soundFile);
  }

  // 更新UI
  micBtn.textContent = '🎤 使用麦克风';
  micBtn.style.background = '#FF9800';
  fileNameDiv.textContent = '麦克风已停止';

  // 如果有文件加载，显示播放/暂停按钮
  if (hasUploadedAudio) {
    playPauseBtn.style.display = 'block';
    fileNameDiv.textContent = '已切换到文件模式';
  }
}
// 使用按钮切换播放/暂停
function togglePlayPause() {
  let playPauseBtn = document.getElementById('playPauseBtn');

  // 如果没有上传文件，按钮会被禁用，所以这种情况不应该发生
  if (!soundFile || !hasUploadedAudio) {
    return;
  }

  userStartAudio();

  if (isPlaying) {
    // 暂停
    if (isVideo) {
      soundFile.pause();
      console.log('Video paused');
    } else {
      soundFile.amp(0, 0.5);
      console.log('Audio faded out');
    }
    isPlaying = false;
    playPauseBtn.textContent = '▶ 播放';
    playPauseBtn.style.background = '#4CAF50';
  } else {
    // 播放
    if (isVideo) {
      soundFile.loop(); // 播放时设置为循环
      soundFile.play();
      console.log('Video playing, time:', soundFile.time());
      soundFile.volume(1.0);
    } else {
      soundFile.play();
      console.log('Audio file playing');
    }
    isPlaying = true;
    playPauseBtn.textContent = '⏸ 暂停';
    playPauseBtn.style.background = '#FF5722';
  }
}

function draw() {
  background(247, 241, 219, 25); // 轻微透明度以产生轨迹效果
  // 将原点移动到画布中心
  translate(width / 2, height / 2);

  // 根据音频电平绘制线条组
  let level;

  // 视频使用 Web Audio API，音频文件和麦克风使用 p5.Amplitude
  if (isVideo && analyser && !isUsingMic) {
    // 从 Web Audio API 分析器获取音频电平
    let dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    // 从频率数据计算平均电平
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    level = sum / dataArray.length / 255; // 归一化到 0-1
  } else {
    // 音频文件和麦克风使用 p5.Amplitude
    level = amplitude ? amplitude.getLevel() : 0;
  }

  // 调试：在控制台显示当前电平
  if (frameCount % 10 === 0) { // 每10帧记录一次以获得更频繁的更新
    console.log('Audio level:', level.toFixed(4), 'Is playing:', isPlaying, 'Is video:', isVideo, 'Has uploaded:', hasUploadedAudio, 'Using mic:', isUsingMic);
  }

  // 只有在实际音频且正在播放时才动画
  let numGroups = 0; // 默认：无动画
  let isActive = (isUsingMic && micStarted) || isPlaying;
  if (isActive && level > 0.001) { // 视频音频和麦克风的阈值降低到 0.001
    numGroups = floor(map(level, 0, 1, 1, 8));
    console.log('Animating with', numGroups, 'groups, level:', level.toFixed(4));
  }

  for (let g = 0; g < numGroups; g++) {
    drawLineGroup();
  }
}

// 在鼠标点击时切换音频/视频播放
function mousePressed() {
  // 检查点击是否在按钮上 - 如果是，不在这里处理
  if (event && event.target && event.target.tagName === 'BUTTON') {
    return; // 让按钮的 onclick 处理器处理
  }

  // 只有在上传了文件且不在点击UI元素时才切换
  if (hasUploadedAudio) {
    togglePlayPause();
  }
}

// 窗口大小调整
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  setup();
}
