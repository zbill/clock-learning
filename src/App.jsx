import React, { useState, useRef, useEffect } from 'react';


// 阻止默认触摸行为（滚动、缩放、前进后退）
document.addEventListener('touchstart', (e) => {
  if (e.target.closest('.clock-area, .hand, button')) {
    e.preventDefault();
  }
}, { passive: false });

// 阻止双指缩放
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());
document.addEventListener('gestureend', (e) => e.preventDefault());

// 阻止鼠标右键菜单（以防万一）
document.addEventListener('contextmenu', (e) => e.preventDefault());


function App() {
  const [currentMode, setCurrentMode] = useState('');
  const [chances, setChances] = useState(3);
  const [targetTime, setTargetTime] = useState({ hour: 12, minute: 0, second: 0 });
  const [currentTime, setCurrentTime] = useState({ hour: 12, minute: 0, second: 0 });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [draggedHand, setDraggedHand] = useState(null);
  const [dragStartAngle, setDragStartAngle] = useState(0);
  const [dragAccumulatedAngle, setDragAccumulatedAngle] = useState(0);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [longPressHand, setLongPressHand] = useState(null);
  const [longPressDirection, setLongPressDirection] = useState(null);
  const [longPressSpeed, setLongPressSpeed] = useState(0);
  
  const clockFaceRef = useRef(null);
  const clockSize = 380;

  // 实时时间更新定时器
  const realtimeTimerRef = useRef(null);

  const updateRealTime = () => {
    const now = new Date();
    const hours = now.getHours() % 12 || 12; // 转换为12小时制，0点转换为12
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    setCurrentTime({ hour: hours, minute: minutes, second: seconds });
  };

  const startMode = (mode) => {
    setCurrentMode(mode);
    if (mode !== 'learn') {
      setChances(3);
    }
    setMessage('');
    setMessageType('');
    
    // 清除之前可能存在的实时时间定时器
    if (realtimeTimerRef.current) {
      clearInterval(realtimeTimerRef.current);
      realtimeTimerRef.current = null;
    }
    
    if (mode === 'read') {
      const targetHour = Math.floor(Math.random() * 12) + 1;
      const targetMinute = Math.floor(Math.random() * 60);
      setTargetTime({ hour: targetHour, minute: targetMinute, second: 0 });
      setCurrentTime({ hour: 0, minute: 0, second: 0 });
    } else if (mode === 'set') {
      const targetHour = Math.floor(Math.random() * 12) + 1;
      const targetMinute = Math.floor(Math.random() * 60);
      setTargetTime({ hour: targetHour, minute: targetMinute, second: 0 });
      const randomHour = Math.floor(Math.random() * 12) + 1;
      const randomMinute = Math.floor(Math.random() * 60);
      setCurrentTime({ hour: randomHour, minute: randomMinute, second: 0 });
    } else if (mode === 'learn') {
      setCurrentTime({ hour: 12, minute: 0, second: 0 });
    } else if (mode === 'realtime') {
      // 立即更新一次时间
      updateRealTime();
      // 设置定时器，每秒更新一次时间
      realtimeTimerRef.current = setInterval(updateRealTime, 1000);
    }
  };

  const backToEntry = () => {
    setCurrentMode('');
    // 清除实时时间定时器
    if (realtimeTimerRef.current) {
      clearInterval(realtimeTimerRef.current);
      realtimeTimerRef.current = null;
    }
  };

  const renderNumbers = () => {
    const numbers = [];
    for (let i = 1; i <= 12; i++) {
      const angle = (i * 30) * (Math.PI / 180);
      const radius = clockSize / 2 - 35;
      const x = Math.sin(angle) * radius;
      const y = -Math.cos(angle) * radius;

      numbers.push(
        <div
          key={i}
          className="clock-number"
          style={{
            left: `calc(50% + ${x}px - 16px)`,
            top: `calc(50% + ${y}px - 16px)`,
          }}
        >
          {i}
        </div>
      );
    }
    return numbers;
  };

  const renderTicks = () => {
    const ticks = [];
    for (let i = 0; i < 60; i++) {
      const isHour = i % 5 === 0;
      const rotation = i * 6;
      
      ticks.push(
        <div
          key={i}
          className={`clock-tick ${isHour ? 'hour-tick' : 'minute-tick'}`}
          style={{ transform: `rotate(${rotation}deg)` }}
        />
      );
    }
    return ticks;
  };

  const getAngleFromPosition = (clientX, clientY) => {
    const rect = clockFaceRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const angle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI) + 90;
    const normalizedAngle = angle < 0 ? angle + 360 : angle;
    return normalizedAngle;
  };

  const startDrag = (e, hand) => {
    if (currentMode === 'read') return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDraggedHand(hand);
  };

  const drag = (e) => {
    if (!isDragging || !draggedHand || !clockFaceRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    let clientX, clientY;
    if (e.type === 'touchmove') {
      e.touches[0].preventDefault();
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const currentAngle = getAngleFromPosition(clientX, clientY);
    let newTime = { ...currentTime };
    
    if (draggedHand === 'second') {
      // 秒针直接跟随鼠标位置，每个小格子6度，转完一圈继续转
      // 计算当前角度对应的秒数（0-59）
      const angleSeconds = Math.round(currentAngle / 6) % 60;
      const normalizedAngleSeconds = angleSeconds < 0 ? angleSeconds + 60 : angleSeconds;
      
      // 计算秒针的变化方向和圈数
      let secondDiff = normalizedAngleSeconds - currentTime.second;
      if (secondDiff > 30) {
        secondDiff -= 60; // 逆时针转
      } else if (secondDiff < -30) {
        secondDiff += 60; // 顺时针转
      }
      
      // 计算新的时间
      let newSeconds = currentTime.second + secondDiff;
      let newMinutes = currentTime.minute;
      let newHours = currentTime.hour;
      
      // 处理秒针进位
      if (newSeconds >= 60) {
        newMinutes += Math.floor(newSeconds / 60);
        newSeconds = newSeconds % 60;
      } else if (newSeconds < 0) {
        newMinutes += Math.floor(newSeconds / 60);
        newSeconds = newSeconds % 60 + 60;
      }
      
      // 处理分针进位
      if (newMinutes >= 60) {
        newHours += Math.floor(newMinutes / 60);
        newMinutes = newMinutes % 60;
      } else if (newMinutes < 0) {
        newHours += Math.floor(newMinutes / 60);
        newMinutes = newMinutes % 60 + 60;
      }
      
      // 处理时针进位
      newHours = ((newHours - 1) % 12 + 12) % 12 + 1;
      
      newTime = {
        hour: newHours,
        minute: newMinutes,
        second: newSeconds
      };
      
    } else if (draggedHand === 'minute') {
      // 分针直接跟随鼠标位置，每个小格子6度，转完一圈继续转
      // 计算当前角度对应的分钟数（0-59）
      const angleMinutes = Math.round(currentAngle / 6) % 60;
      const normalizedAngleMinutes = angleMinutes < 0 ? angleMinutes + 60 : angleMinutes;
      
      // 计算分针的变化方向和圈数
      let minuteDiff = normalizedAngleMinutes - currentTime.minute;
      if (minuteDiff > 30) {
        minuteDiff -= 60; // 逆时针转
      } else if (minuteDiff < -30) {
        minuteDiff += 60; // 顺时针转
      }
      
      // 计算新的时间
      let newMinutes = currentTime.minute + minuteDiff;
      let newHours = currentTime.hour;
      
      // 处理分针进位
      if (newMinutes >= 60) {
        newHours += Math.floor(newMinutes / 60);
        newMinutes = newMinutes % 60;
      } else if (newMinutes < 0) {
        newHours += Math.floor(newMinutes / 60);
        newMinutes = newMinutes % 60 + 60;
      }
      
      // 处理时针进位
      newHours = ((newHours - 1) % 12 + 12) % 12 + 1;
      
      newTime = {
        hour: newHours,
        minute: newMinutes,
        second: currentTime.second
      };
      
    } else if (draggedHand === 'hour') {
      // 时针直接跟随鼠标位置，每个大格子30度，转完一圈继续转
      // 计算当前角度对应的小时数（0-11，对应1-12）
      const angleHours = Math.round(currentAngle / 30) % 12;
      const normalizedAngleHours = angleHours < 0 ? angleHours + 12 : angleHours;
      const targetHour = normalizedAngleHours === 0 ? 12 : normalizedAngleHours;
      
      // 计算时针的变化方向和圈数
      let hourDiff = targetHour - currentTime.hour;
      if (hourDiff > 6) {
        hourDiff -= 12; // 逆时针转
      } else if (hourDiff < -6) {
        hourDiff += 12; // 顺时针转
      }
      
      // 计算新的时间
      let newHours = currentTime.hour + hourDiff;
      
      // 处理时针进位
      newHours = ((newHours - 1) % 12 + 12) % 12 + 1;
      
      newTime = {
        hour: newHours,
        minute: currentTime.minute,
        second: currentTime.second
      };
    }
    
    setCurrentTime(newTime);
  };

  const stopDrag = () => {
    setIsDragging(false);
    setDraggedHand(null);
  };

  const adjustHand = (hand, direction) => {
    let newTime = { ...currentTime };
    
    if (hand === 'second') {
      // 秒针调整，每次1秒
      let newSeconds = currentTime.second + (direction === 'clockwise' ? 1 : -1);
      let newMinutes = currentTime.minute;
      let newHours = currentTime.hour;
      
      // 处理秒针进位
      if (newSeconds >= 60) {
        newMinutes += Math.floor(newSeconds / 60);
        newSeconds = newSeconds % 60;
      } else if (newSeconds < 0) {
        newMinutes += Math.floor(newSeconds / 60);
        newSeconds = newSeconds % 60 + 60;
      }
      
      // 处理分针进位
      if (newMinutes >= 60) {
        newHours += Math.floor(newMinutes / 60);
        newMinutes = newMinutes % 60;
      } else if (newMinutes < 0) {
        newHours += Math.floor(newMinutes / 60);
        newMinutes = newMinutes % 60 + 60;
      }
      
      // 处理时针进位
      newHours = ((newHours - 1) % 12 + 12) % 12 + 1;
      
      newTime = {
        hour: newHours,
        minute: newMinutes,
        second: newSeconds
      };
      
    } else if (hand === 'minute') {
      // 分针调整，每次1分钟
      let newMinutes = currentTime.minute + (direction === 'clockwise' ? 1 : -1);
      let newHours = currentTime.hour;
      
      // 处理分针进位
      if (newMinutes >= 60) {
        newHours += Math.floor(newMinutes / 60);
        newMinutes = newMinutes % 60;
      } else if (newMinutes < 0) {
        newHours += Math.floor(newMinutes / 60);
        newMinutes = newMinutes % 60 + 60;
      }
      
      // 处理时针进位
      newHours = ((newHours - 1) % 12 + 12) % 12 + 1;
      
      newTime = {
        hour: newHours,
        minute: newMinutes,
        second: currentTime.second
      };
      
    } else if (hand === 'hour') {
      // 时针调整，每次1小时
      let newHours = currentTime.hour + (direction === 'clockwise' ? 1 : -1);
      
      // 处理时针进位
      newHours = ((newHours - 1) % 12 + 12) % 12 + 1;
      
      newTime = {
        hour: newHours,
        minute: currentTime.minute,
        second: currentTime.second
      };
    }
    
    setCurrentTime(newTime);
  };

  const handleButtonPress = (hand, direction) => {
    // 立即执行一次调整
    adjustHand(hand, direction);
    
    // 清除之前可能存在的定时器
    if (longPressTimer) {
      clearInterval(longPressTimer);
    }
    
    // 设置长按定时器，使用简单的加速逻辑
    let interval = 300; // 初始间隔300ms
    
    const timer = setInterval(() => {
      adjustHand(hand, direction);
    }, interval);
    
    setLongPressTimer(timer);
    setLongPressHand(hand);
    setLongPressDirection(direction);
  };

  const stopLongPress = () => {
    if (longPressTimer) {
      clearInterval(longPressTimer);
      setLongPressTimer(null);
      setLongPressHand(null);
      setLongPressDirection(null);
      setLongPressSpeed(0);
    }
  };

  const updateTime = (field, value) => {
    if (currentMode === 'set') return;
    
    const newTime = { ...currentTime, [field]: parseInt(value) || 0 };
    setCurrentTime(newTime);
  };

  const checkAnswer = () => {
    if (currentMode === 'read') {
      const userHour = currentTime.hour;
      const userMinute = currentTime.minute;
      
      if (userHour === targetTime.hour && userMinute === targetTime.minute) {
        setMessage('正确！');
        setMessageType('success');
        setTimeout(() => {
          const targetHour = Math.floor(Math.random() * 12) + 1;
          const targetMinute = Math.floor(Math.random() * 60);
          setTargetTime({ hour: targetHour, minute: targetMinute, second: 0 });
          setCurrentTime({ hour: 0, minute: 0, second: 0 });
          setMessage('');
          setMessageType('');
        }, 2000); // 延长显示时间
      } else {
        setChances(prev => prev - 1);
        // 显示正确的指针位置
        setCurrentTime({ ...targetTime, second: 0 });
        setMessage(`错误！正确时间是 ${targetTime.hour.toString().padStart(2, '0')}:${targetTime.minute.toString().padStart(2, '0')}`);
        setMessageType('error');
        if (chances <= 1) {
          setMessage('机会用完了！返回主界面');
          setMessageType('error');
          setTimeout(backToEntry, 3000); // 延长显示时间
        } else {
          setTimeout(() => {
            const targetHour = Math.floor(Math.random() * 12) + 1;
            const targetMinute = Math.floor(Math.random() * 60);
            setTargetTime({ hour: targetHour, minute: targetMinute, second: 0 });
            setCurrentTime({ hour: 0, minute: 0, second: 0 });
            setMessage('');
            setMessageType('');
          }, 3000); // 延长显示时间
        }
      }
    } else if (currentMode === 'set') {
      if (Math.abs(currentTime.hour - targetTime.hour) < 0.5 && 
          Math.abs(currentTime.minute - targetTime.minute) < 1) {
        setMessage('正确！');
        setMessageType('success');
        setTimeout(() => {
          const targetHour = Math.floor(Math.random() * 12) + 1;
          const targetMinute = Math.floor(Math.random() * 60);
          setTargetTime({ hour: targetHour, minute: targetMinute, second: 0 });
          const randomHour = Math.floor(Math.random() * 12) + 1;
          const randomMinute = Math.floor(Math.random() * 60);
          setCurrentTime({ hour: randomHour, minute: randomMinute, second: 0 });
          setMessage('');
          setMessageType('');
        }, 2000); // 延长显示时间
      } else {
        setChances(prev => prev - 1);
        // 显示指针所指的数值
        setMessage(`错误！指针所指时间是 ${currentTime.hour.toString().padStart(2, '0')}:${currentTime.minute.toString().padStart(2, '0')}`);
        setMessageType('error');
        if (chances <= 1) {
          setMessage('机会用完了！返回主界面');
          setMessageType('error');
          setTimeout(backToEntry, 3000); // 延长显示时间
        } else {
          setTimeout(() => {
            const targetHour = Math.floor(Math.random() * 12) + 1;
            const targetMinute = Math.floor(Math.random() * 60);
            setTargetTime({ hour: targetHour, minute: targetMinute, second: 0 });
            const randomHour = Math.floor(Math.random() * 12) + 1;
            const randomMinute = Math.floor(Math.random() * 60);
            setCurrentTime({ hour: randomHour, minute: randomMinute, second: 0 });
            setMessage('');
            setMessageType('');
          }, 3000); // 延长显示时间
        }
      }
    }
  };

  const displayTime = currentMode === 'read' ? targetTime : currentTime;
  const secondDegrees = (displayTime.second / 60) * 360;
  const minuteDegrees = ((displayTime.minute + displayTime.second / 60) / 60) * 360;
  const hourDegrees = ((displayTime.hour % 12 + displayTime.minute / 60) / 12) * 360;
  
  const inputTime = currentMode === 'set' ? targetTime : currentTime;

  if (!currentMode) {
    return (
      <div id="entry-page" className="container">
        <h1>公鸡打鸣</h1>
        <div className="mode-buttons">
          <button className="mode-btn" onClick={() => startMode('read')} onTouchStart={() => startMode('read')}>读指针模式</button>
          <button className="mode-btn" onClick={() => startMode('set')} onTouchStart={() => startMode('set')}>拨指针模式</button>
          <button className="mode-btn" onClick={() => startMode('learn')} onTouchStart={() => startMode('learn')}>认表模式</button>
          <button className="mode-btn" onClick={() => startMode('realtime')} onTouchStart={() => startMode('realtime')}>实时钟表模式</button>
        </div>
      </div>
    );
  }

  return (
    <div id="clock-page" className="container clock-container">
      <h2 id="mode-title">
        {currentMode === 'read' ? '读指针模式' : 
         currentMode === 'set' ? '拨指针模式' : 
         currentMode === 'realtime' ? '实时钟表模式' : '认表模式'}
      </h2>
      
      <div className="clock-face" ref={clockFaceRef}>
        <div className="clock-inner-ring" />
        {renderTicks()}
        {renderNumbers()}
        
        <div 
          className="clock-hand hour-hand" 
          id="hour-hand"
          style={{ transform: `rotate(${hourDegrees}deg)` }}
          onMouseDown={(e) => currentMode !== 'realtime' && startDrag(e, 'hour')}
          onTouchStart={(e) => currentMode !== 'realtime' && startDrag(e, 'hour')}
        />
        
        <div 
          className="clock-hand minute-hand" 
          id="minute-hand"
          style={{ transform: `rotate(${minuteDegrees}deg)` }}
          onMouseDown={(e) => currentMode !== 'realtime' && startDrag(e, 'minute')}
          onTouchStart={(e) => currentMode !== 'realtime' && startDrag(e, 'minute')}
        />
        
        {currentMode !== 'read' && currentMode !== 'set' && (
          <div 
            className="clock-hand second-hand" 
            id="second-hand"
            style={{ transform: `rotate(${secondDegrees}deg)` }}
            onMouseDown={(e) => currentMode !== 'realtime' && startDrag(e, 'second')}
            onTouchStart={(e) => currentMode !== 'realtime' && startDrag(e, 'second')}
          />
        )}
        
        <div className="clock-center"></div>
      </div>
      
      {/* 指针控制按键 */}
      {(currentMode === 'set' || currentMode === 'learn') && (
        <div className="hand-controls">
          {currentMode === 'set' && (
            <>
              <div className="control-group">
                <button 
                  className="control-btn" 
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleButtonPress('hour', 'clockwise');
                  }}
                  onPointerUp={stopLongPress}
                  onPointerLeave={stopLongPress}
                >时针-顺</button>
                <button 
                  className="control-btn" 
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleButtonPress('hour', 'counterclockwise');
                  }}
                  onPointerUp={stopLongPress}
                  onPointerLeave={stopLongPress}
                >时针-逆</button>
              </div>
              <div className="control-group">
                <button 
                  className="control-btn" 
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleButtonPress('minute', 'clockwise');
                  }}
                  onPointerUp={stopLongPress}
                  onPointerLeave={stopLongPress}
                >分针-顺</button>
                <button 
                  className="control-btn" 
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleButtonPress('minute', 'counterclockwise');
                  }}
                  onPointerUp={stopLongPress}
                  onPointerLeave={stopLongPress}
                >分针-逆</button>
              </div>
            </>
          )}
          {currentMode === 'learn' && (
            <>
              <div className="control-group">
                <button 
                  className="control-btn" 
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleButtonPress('hour', 'clockwise');
                  }}
                  onPointerUp={stopLongPress}
                  onPointerLeave={stopLongPress}
                >时针-顺</button>
                <button 
                  className="control-btn" 
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleButtonPress('hour', 'counterclockwise');
                  }}
                  onPointerUp={stopLongPress}
                  onPointerLeave={stopLongPress}
                >时针-逆</button>
              </div>
              <div className="control-group">
                <button 
                  className="control-btn" 
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleButtonPress('minute', 'clockwise');
                  }}
                  onPointerUp={stopLongPress}
                  onPointerLeave={stopLongPress}
                >分针-顺</button>
                <button 
                  className="control-btn" 
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleButtonPress('minute', 'counterclockwise');
                  }}
                  onPointerUp={stopLongPress}
                  onPointerLeave={stopLongPress}
                >分针-逆</button>
              </div>
              <div className="control-group">
                <button 
                  className="control-btn" 
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleButtonPress('second', 'clockwise');
                  }}
                  onPointerUp={stopLongPress}
                  onPointerLeave={stopLongPress}
                >秒针-顺</button>
                <button 
                  className="control-btn" 
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleButtonPress('second', 'counterclockwise');
                  }}
                  onPointerUp={stopLongPress}
                  onPointerLeave={stopLongPress}
                >秒针-逆</button>
              </div>
            </>
          )}
        </div>
      )}
      
      {((currentMode !== 'read' && currentMode !== 'set') || currentMode === 'realtime') && (
        <div className="time-display" id="time-display">
          {displayTime.hour.toString().padStart(2, '0')}:
          {displayTime.minute.toString().padStart(2, '0')}
          <span>:
          {displayTime.second.toString().padStart(2, '0')}
          </span>
        </div>
      )}
      
      {currentMode !== 'realtime' && (
        <div className="time-inputs" id="time-inputs">
        <input 
          type="number" 
          className="time-input" 
          id="hour-input" 
          min="0" 
          max="12" 
          value={inputTime.hour}
          onChange={(e) => updateTime('hour', e.target.value)}
          disabled={currentMode === 'set'}
        />
        <span>:</span>
        <input 
          type="number" 
          className="time-input" 
          id="minute-input" 
          min="0" 
          max="59" 
          value={inputTime.minute}
          onChange={(e) => updateTime('minute', e.target.value)}
          disabled={currentMode === 'set'}
        />
        {currentMode !== 'read' && currentMode !== 'set' && (
          <>
            <span>:</span>
            <input 
              type="number" 
              className="time-input" 
              id="second-input" 
              min="0" 
              max="59" 
              value={currentTime.second}
              onChange={(e) => updateTime('second', e.target.value)}
              disabled={currentMode === 'set'}
            />
   </>
        )}
        </div>
      )}
      
      {currentMode !== 'learn' && currentMode !== 'realtime' && (
        <div className="chances" id="chances">剩余机会：{chances}</div>
      )}
      {message && (
        <div className={`message ${messageType}`} id="message">{message}</div>
      )}
      
      {(currentMode === 'read' || currentMode === 'set') && currentMode !== 'realtime' && (
        <button className="confirm-btn" id="confirm-btn" onClick={checkAnswer} onTouchStart={checkAnswer}>确认</button>
      )}
      <button className="back-btn" onClick={backToEntry} onTouchStart={backToEntry}>返回</button>
      
      {isDragging && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1000 }}
          onMouseMove={drag}
          onTouchMove={drag}
          onMouseUp={stopDrag}
          onTouchEnd={stopDrag}
        />
      )}
    </div>
  );
}

export default App;
