/**
 * timer.js - Client-side JavaScript for the Pomodoro Timer functionality
 *
 * This file contains all functionality related to the Pomodoro Timer, including:
 * - Timer initialization and control (start, pause, reset)
 * - Session tracking and management
 * - Goal integration and progress tracking
 * - UI updates and interactions
 */

// Timer state variables
let timer;                  // Timer interval reference
let timeLeft;               // Seconds remaining in current interval
let isRunning = false;      // Whether timer is currently running
let isPaused = false;       // Whether timer is paused
let isWorkTime = true;      // Whether in work session or break
let workMinutes = 25;       // Length of work session in minutes
let breakMinutes = 5;       // Length of break in minutes
let sessionsCompleted = 0;  // Count of completed sessions
let startTime;              // Start time of current session
let sessions = [];          // Array of completed session data
let autoStartTimer = false; // Whether to start timer automatically
let currentPomodoroCount = 0; // Current pomodoro completed for goal
let totalPomodoros = 1;     // Total pomodoros needed for goal

/**
 * Initialize timer with current settings
 */
function initTimer() {
    // Get user-defined timer duration settings
    workMinutes = parseInt(document.getElementById('work-minutes').value) || 25;
    breakMinutes = parseInt(document.getElementById('break-minutes').value) || 5;

    // Set initial time for the timer (work session)
    timeLeft = workMinutes * 60;

    // Update the display to show initial time
    updateDisplay();
}

/**
 * Update timer display with current time remaining
 */
function updateDisplay() {
    const timeDisplay = document.getElementById('time-display');
    if (!timeDisplay) return;

    // Calculate minutes and seconds from timeLeft
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    // Format time as MM:SS with leading zeros
    timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Start or resume the timer
 */
function startTimer() {
    if (!isRunning) {
        if (isPaused) {
            // Resuming after pause
            isPaused = false;
        } else {
            // Starting fresh session
            startTime = new Date();
        }

        isRunning = true;

        // Update status text based on work/break and pomodoro count
        const statusText = document.getElementById('status-text');
        if (statusText) {
            if (isWorkTime) {
                statusText.textContent = `Work Time (Pomodoro ${currentPomodoroCount + 1} of ${totalPomodoros})`;
            } else {
                statusText.textContent = 'Break Time';
            }
        }

        // Update UI state - disable inputs while timer is running
        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const workMinutesInput = document.getElementById('work-minutes');
        const breakMinutesInput = document.getElementById('break-minutes');
        const goalSelect = document.getElementById('goal-select');

        if (startBtn) startBtn.disabled = true;
        if (pauseBtn) pauseBtn.disabled = false;
        if (workMinutesInput) workMinutesInput.disabled = true;
        if (breakMinutesInput) breakMinutesInput.disabled = true;
        if (goalSelect) goalSelect.disabled = true;

        // Start countdown
        timer = setInterval(() => {
            timeLeft--;
            updateDisplay();

            if (timeLeft <= 0) {
                clearInterval(timer);
                completeSession();
            }
        }, 1000);
    }
}

/**
 * Pause the timer
 */
function pauseTimer() {
    if (isRunning) {
        clearInterval(timer);
        isPaused = true;
        isRunning = false;

        const statusText = document.getElementById('status-text');
        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');

        if (statusText) statusText.textContent = 'Paused';
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = 'Resume';
        }
        if (pauseBtn) pauseBtn.disabled = true;
    }
}

/**
 * Reset the timer to initial state
 */
function resetTimer() {
    // Clear the timer interval
    clearInterval(timer);

    // Reset all timer state variables
    isRunning = false;
    isPaused = false;
    isWorkTime = true;

    // Reset UI elements
    const statusText = document.getElementById('status-text');
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const workMinutesInput = document.getElementById('work-minutes');
    const breakMinutesInput = document.getElementById('break-minutes');
    const goalSelect = document.getElementById('goal-select');

    if (statusText) statusText.textContent = 'Ready to start';

    // Reset pomodoro count for goal
    currentPomodoroCount = 0;

    // Reset button states
    if (startBtn) {
        startBtn.textContent = 'Start';
        startBtn.disabled = false;
    }
    if (pauseBtn) pauseBtn.disabled = true;
    if (workMinutesInput) workMinutesInput.disabled = false;
    if (breakMinutesInput) breakMinutesInput.disabled = false;
    if (goalSelect) goalSelect.disabled = false;

    // Initialize timer with current settings
    initTimer();
}

/**
 * Complete current session (work or break)
 */
function completeSession() {
    const endTime = new Date();

    if (isWorkTime) {
        // Work session completed
        currentPomodoroCount++;

        // Get associated goal information if selected
        const goalSelect = document.getElementById('goal-select');
        const goalId = goalSelect && goalSelect.value ? goalSelect.value : null;
        let selectedGoalText = null;

        if (goalId && goalSelect.selectedIndex >= 0) {
            selectedGoalText = goalSelect.options[goalSelect.selectedIndex].text;
        }

        // Create session record
        const session = {
            startTime,
            endTime,
            duration: Math.floor((endTime - startTime) / 1000),
            isWorkSession: true,
            goalId,
            goalText: selectedGoalText,
            pomodoroNumber: currentPomodoroCount,
            totalPomodoros: totalPomodoros
        };

        // Add to sessions array
        sessions.push(session);

        // Save to localStorage with user-specific key
        const userId = document.getElementById('user-data').getAttribute('data-user-id');
        try {
            localStorage.setItem(`pomodoro_sessions_${userId}`, JSON.stringify(sessions.map(s => ({
                ...s,
                startTime: s.startTime.toISOString(),
                endTime: s.endTime.toISOString()
            }))));
        } catch (error) {
            console.error('Error saving sessions to localStorage:', error);
        }

        // Save session to server
        saveSession(session);

        // Update sessions display
        updateSessionsDisplay();

        // Check if this was the last pomodoro for the goal
        if (currentPomodoroCount >= totalPomodoros) {
            // Final pomodoro completed - show task complete
            isWorkTime = true; // Reset to work time for next goal
            timeLeft = workMinutes * 60;
            isRunning = false;

            const statusText = document.getElementById('status-text');
            const startBtn = document.getElementById('start-btn');
            const pauseBtn = document.getElementById('pause-btn');
            const workMinutesInput = document.getElementById('work-minutes');
            const breakMinutesInput = document.getElementById('break-minutes');
            const goalSelect = document.getElementById('goal-select');

            if (statusText) statusText.textContent = 'Task Completed! 🎉';
            if (startBtn) startBtn.disabled = false;
            if (pauseBtn) pauseBtn.disabled = true;
            if (workMinutesInput) workMinutesInput.disabled = false;
            if (breakMinutesInput) breakMinutesInput.disabled = false;
            if (goalSelect) goalSelect.disabled = false;

            // If this was associated with a goal, mark it as completed
            if (goalId) {
                markGoalAsCompleted(goalId);
            }

            updateDisplay();
        } else {
            // Switch to break time for intermediate pomodoros
            isWorkTime = false;
            timeLeft = breakMinutes * 60;
            isRunning = false; // Reset isRunning flag to ensure startTimer will work

            const statusText = document.getElementById('status-text');
            if (statusText) statusText.textContent = 'Break Time';

            // Ensure the timer is properly cleared
            clearInterval(timer);

            // Small delay before starting break timer to ensure UI updates
            setTimeout(() => {
                startTimer();
            }, 300);
        }
    } else {
        // Break session completed, prepare for next work session
        isWorkTime = true;
        timeLeft = workMinutes * 60;
        isRunning = false;

        const statusText = document.getElementById('status-text');
        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const workMinutesInput = document.getElementById('work-minutes');
        const breakMinutesInput = document.getElementById('break-minutes');
        const goalSelect = document.getElementById('goal-select');

        if (statusText) {
            statusText.textContent = `Ready for Pomodoro ${currentPomodoroCount + 1} of ${totalPomodoros}`;
        }

        if (startBtn) startBtn.disabled = false;
        if (pauseBtn) pauseBtn.disabled = true;

        // Don't enable inputs between pomodoros to maintain focus
        if (currentPomodoroCount < totalPomodoros) {
            // Auto-start next pomodoro after a short break
            setTimeout(() => {
                startTimer();
            }, 1500);
        } else {
            // Re-enable inputs only when completely done
            if (workMinutesInput) workMinutesInput.disabled = false;
            if (breakMinutesInput) breakMinutesInput.disabled = false;
            if (goalSelect) goalSelect.disabled = false;
        }

        updateDisplay();
    }
}

/**
 * Mark a goal as completed on the server
 * @param {string} goalId - ID of the goal to mark as completed
 */
function markGoalAsCompleted(goalId) {
    fetch(`/goals/${goalId}/complete`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                console.log('Goal marked as completed:', data);

                // Remove this goal from the dropdown as it's now completed
                const goalSelect = document.getElementById('goal-select');
                if (goalSelect) {
                    const option = goalSelect.querySelector(`option[value="${goalId}"]`);
                    if (option) {
                        option.remove();
                    }
                }

                // Show a success notification
                const timerDisplay = document.querySelector('.timer-display');
                const currentGoalText = document.getElementById('current-goal-text');

                if (timerDisplay && currentGoalText) {
                    const notification = document.createElement('div');
                    notification.className = 'alert alert-success alert-dismissible fade show mt-3';
                    notification.innerHTML = `
                    <strong>Goal Completed!</strong> "${currentGoalText.textContent}" has been marked as completed.
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                `;
                    timerDisplay.appendChild(notification);
                }

                // Reset goal selection
                if (goalSelect) {
                    goalSelect.value = '';
                    updateCurrentGoalDisplay();
                }
            }
        })
        .catch(error => {
            console.error('Error marking goal as completed:', error);
            // Show error notification if needed
        });
}

/**
 * Save completed session to the server
 * @param {Object} session - Session data to save
 */
function saveSession(session) {
    fetch('/goals/pomodoro', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            goalId: session.goalId,
            startTime: session.startTime.toISOString(),
            endTime: session.endTime.toISOString(),
            completed: true,
            pomodoroNumber: session.pomodoroNumber,
            totalPomodoros: session.totalPomodoros
        })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                console.log('Session saved successfully', data);

                // If the goal status was updated, update the UI to reflect this
                if (data.goalUpdated && session.goalId) {
                    // Add a visual indicator that the goal was marked as completed
                    const listItem = document.querySelector(`#sessions-container li:last-child`);
                    if (listItem) {
                        const goalStatusBadge = document.createElement('div');
                        goalStatusBadge.className = 'mt-2 text-success';
                        goalStatusBadge.innerHTML = '<small><i>Goal marked as completed!</i></small>';
                        listItem.appendChild(goalStatusBadge);
                    }
                }
            } else {
                console.error('Error saving session:', data.error);
            }
        })
        .catch(error => console.error('Error saving session:', error));
}

/**
 * Update the sessions display with completed sessions
 */
function updateSessionsDisplay() {
    const sessionsContainer = document.getElementById('sessions-container');

    if (!sessionsContainer) return;

    if (!sessions || sessions.length === 0) {
        sessionsContainer.innerHTML = '<p>Complete a Pomodoro session to see it here.</p>';
        return;
    }

    let html = '<ul class="list-group">';

    for (let i = 0; i < sessions.length; i++) {
        const session = sessions[i];
        const duration = Math.floor(session.duration / 60);
        const time = new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const goalText = session.goalText ? `Working on: ${session.goalText}` : 'No goal selected';

        // Add pomodoro count info if available
        const pomodoroInfo = session.pomodoroNumber ?
            `<div class="text-muted small">Pomodoro ${session.pomodoroNumber} of ${session.totalPomodoros}</div>` : '';

        html += `
        <li class="list-group-item" id="session-${i}">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <strong>Session ${i + 1}</strong> - ${duration} minutes (${time})
              <div class="text-muted small">${goalText}</div>
              ${pomodoroInfo}
            </div>
            <span class="badge bg-success">Completed</span>
          </div>
        </li>
      `;
    }

    html += '</ul>';
    sessionsContainer.innerHTML = html;
}

/**
 * Update the current goal display
 */
function updateCurrentGoalDisplay() {
    const goalSelect = document.getElementById('goal-select');
    const currentGoalText = document.getElementById('current-goal-text');
    const currentGoalDisplay = document.getElementById('current-goal-display');

    if (!goalSelect || !currentGoalText || !currentGoalDisplay) return;

    if (goalSelect.value) {
        const selectedOption = goalSelect.options[goalSelect.selectedIndex];
        currentGoalText.textContent = selectedOption.text;
        currentGoalDisplay.classList.add('bg-info', 'bg-opacity-10');
        currentGoalDisplay.classList.remove('bg-light');

        // Reset pomodoro counts when a new goal is selected
        currentPomodoroCount = 0;

        // Get the estimated pomodoros from the data attribute
        const estimatedPomodoros = selectedOption.getAttribute('data-estimated-pomodoros');
        totalPomodoros = parseInt(estimatedPomodoros) || 1;

    } else {
        currentGoalText.textContent = 'None selected';
        currentGoalDisplay.classList.remove('bg-info', 'bg-opacity-10');
        currentGoalDisplay.classList.add('bg-light');

        // Reset progress tracking
        totalPomodoros = 1;
        currentPomodoroCount = 0;
    }
}

/**
 * Parse URL parameters on page load
 * @returns {Object} Object containing parsed URL parameters
 */
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const autoStart = params.get('autoStart');

    return {
        goalId: params.get('goalId'),
        duration: parseInt(params.get('duration')) || 25,
        breakDuration: parseInt(params.get('breakDuration')) || 5,
        autoStart: autoStart === 'true' || autoStart === '1'
    };
}

/**
 * Set initial values from URL parameters
 */
function initFromUrlParams() {
    const params = getUrlParams();
    const goalSelect = document.getElementById('goal-select');
    const workMinutesInput = document.getElementById('work-minutes');
    const breakMinutesInput = document.getElementById('break-minutes');

    if (!goalSelect || !workMinutesInput || !breakMinutesInput) return;

    if (params.goalId) {
        goalSelect.value = params.goalId;
        // When a goal is selected, update the display
        updateCurrentGoalDisplay();
    } else {
        // Set default values for progress tracking
        totalPomodoros = 1;
    }

    if (params.duration) {
        workMinutesInput.value = params.duration;
    }

    if (params.breakDuration) {
        breakMinutesInput.value = params.breakDuration;
    }

    // Store auto-start flag
    autoStartTimer = params.autoStart;

    initTimer();

    // If auto-start is specified, start the timer automatically
    if (autoStartTimer) {
        // Small delay to ensure UI is updated first
        setTimeout(() => {
            startTimer();
        }, 500);
    }
}

/**
 * Load sessions from localStorage
 */
function loadSessions() {
    const userId = document.getElementById('user-data')?.getAttribute('data-user-id');

    if (!userId) return;

    // Only load from localStorage if we don't have server sessions
    if (sessions.length === 0) {
        const savedSessions = localStorage.getItem(`pomodoro_sessions_${userId}`);
        if (savedSessions) {
            try {
                sessions = JSON.parse(savedSessions).map(session => {
                    return {
                        ...session,
                        startTime: new Date(session.startTime),
                        endTime: new Date(session.endTime)
                    };
                });
            } catch (e) {
                console.error('Error loading saved sessions:', e);
                sessions = [];
            }
        }
    }

    updateSessionsDisplay();
}

/**
 * Initialize the timer page
 */
function initTimerPage() {
    // Initialize session data from server if provided
    const existingSessionsElement = document.getElementById('existing-sessions-data');
    if (existingSessionsElement) {
        try {
            const serverSessions = JSON.parse(existingSessionsElement.getAttribute('data-sessions'));
            if (serverSessions && serverSessions.length > 0) {
                sessions = serverSessions.map(session => ({
                    ...session,
                    startTime: new Date(session.startTime),
                    endTime: new Date(session.endTime)
                }));
            }
        } catch (e) {
            console.error('Error parsing server sessions:', e);
        }
    }

    // Set values from URL parameters first
    initFromUrlParams();

    // Load additional sessions from localStorage
    loadSessions();

    // Add change event to goal select to update display
    const goalSelect = document.getElementById('goal-select');
    if (goalSelect) {
        goalSelect.addEventListener('change', updateCurrentGoalDisplay);
    }

    // Add event listeners to buttons
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const workMinutesInput = document.getElementById('work-minutes');
    const breakMinutesInput = document.getElementById('break-minutes');

    if (startBtn) {
        startBtn.addEventListener('click', startTimer);
    }

    if (pauseBtn) {
        pauseBtn.addEventListener('click', pauseTimer);
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', resetTimer);
    }

    if (workMinutesInput) {
        workMinutesInput.addEventListener('change', initTimer);
    }

    if (breakMinutesInput) {
        breakMinutesInput.addEventListener('change', initTimer);
    }
}

// Add event listener to initialize the timer page when the DOM is loaded
document.addEventListener('DOMContentLoaded', initTimerPage);