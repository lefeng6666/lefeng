/**
 * dashboard.js - Client-side JavaScript for the dashboard page
 * Handles goal management, statistics visualization, and user interactions
 */

/**
 * Initialize the dashboard with goals data
 * @param {Array} goals - Array of goal objects from the server
 */
function initDashboard(goals) {
    try {
        renderGoalStatusChart(goals);
        initGoalActionButtons();
        updateEstimatedCompletionTime();
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        // Display error message to user if needed
        displayErrorMessage('There was a problem loading the dashboard.');
    }
}

/**
 * Displays an error message on the dashboard
 * @param {string} message - The error message to display
 */
function displayErrorMessage(message) {
    const container = document.querySelector('.container');
    if (container) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show mt-3';
        alertDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        container.prepend(alertDiv);
    }
}

/**
 * Render the goal status distribution chart
 * @param {Array} goals - Array of goal objects
 */
function renderGoalStatusChart(goals) {
    // Calculate goal status counts
    let pendingCount = 0;
    let completedCount = 0;

    if (goals && goals.length > 0) {
        for (let i = 0; i < goals.length; i++) {
            if (goals[i].status === 'Pending') {
                pendingCount++;
            } else if (goals[i].status === 'Completed') {
                completedCount++;
            }
        }
    }

    const statusCounts = {
        'Pending': pendingCount,
        'Completed': completedCount
    };

    const hasData = Object.values(statusCounts).some(value => value > 0);
    const chartElement = document.getElementById('goalStatusChart');

    if (!chartElement) {
        console.warn('Goal status chart element not found');
        return;
    }

    const ctx = chartElement.getContext('2d');

    // Create appropriate chart based on available data
    if (hasData) {
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusCounts),
                datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: ['#6c757d', '#28a745']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const total = Object.values(statusCounts).reduce((sum, val) => sum + val, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${value} goals (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    } else {
        // Display a placeholder chart when no data is available
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['No Data Available'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#e9ecef'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function() {
                                return 'No goals available';
                            }
                        }
                    }
                }
            }
        });
    }
}

/**
 * Initialize all interactive elements for goal management
 */
function initGoalActionButtons() {
    initEditButtons();
    initDeleteButtons();
    initTimerButtons();
    initDeleteAccountModal();
}

/**
 * Initialize edit goal buttons with event handlers
 */
function initEditButtons() {
    const editButtons = document.querySelectorAll('.edit-goal');
    if (editButtons.length > 0) {
        editButtons.forEach(function(button) {
            button.addEventListener('click', function() {
                // Extract data attributes
                const id = this.getAttribute('data-id');
                const title = this.getAttribute('data-title');
                const description = this.getAttribute('data-description') || '';
                const category = this.getAttribute('data-category') || '';
                const priority = this.getAttribute('data-priority');
                const status = this.getAttribute('data-status');
                const deadline = this.getAttribute('data-deadline') || '';
                const estimatedPomodoros = this.getAttribute('data-estimated-pomodoros') || '1';

                // Fill form with data
                const editGoalId = document.getElementById('edit-goal-id');
                const editTitle = document.getElementById('edit-title');
                const editDescription = document.getElementById('edit-description');
                const editCategory = document.getElementById('edit-category');
                const editPriority = document.getElementById('edit-priority');
                const editStatus = document.getElementById('edit-status');
                const editDeadline = document.getElementById('edit-deadline');
                const editEstimatedPomodoros = document.getElementById('edit-estimated_pomodoros');
                const editGoalForm = document.getElementById('editGoalForm');

                if (!editGoalId || !editTitle || !editDescription || !editCategory ||
                    !editPriority || !editStatus || !editDeadline ||
                    !editEstimatedPomodoros || !editGoalForm) {
                    console.error('One or more edit form elements not found');
                    return;
                }

                // Set form field values
                editGoalId.value = id;
                editTitle.value = title;
                editDescription.value = description;

                // Set the correct category in the dropdown
                for (let i = 0; i < editCategory.options.length; i++) {
                    if (editCategory.options[i].value === category) {
                        editCategory.selectedIndex = i;
                        break;
                    }
                }

                editPriority.value = priority;
                editStatus.value = status;
                editDeadline.value = deadline;
                editEstimatedPomodoros.value = estimatedPomodoros;

                // Set form action
                editGoalForm.action = `/goals/${id}?_method=PUT`;

                // Show modal using Bootstrap's Modal API
                try {
                    const editModal = new bootstrap.Modal(document.getElementById('editGoalModal'));
                    editModal.show();
                } catch (error) {
                    console.error('Error showing edit modal:', error);
                }
            });
        });
    }
}

/**
 * Initialize delete goal buttons with event handlers
 */
function initDeleteButtons() {
    const deleteButtons = document.querySelectorAll('.delete-goal');
    if (deleteButtons.length > 0) {
        deleteButtons.forEach(function(button) {
            button.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                const form = document.getElementById('deleteGoalForm');

                if (!form) {
                    console.error('Delete goal form not found');
                    return;
                }

                // Set form action
                form.action = `/goals/${id}?_method=DELETE`;

                // Show modal using Bootstrap's Modal API
                try {
                    const deleteModal = new bootstrap.Modal(document.getElementById('deleteGoalModal'));
                    deleteModal.show();
                } catch (error) {
                    console.error('Error showing delete modal:', error);
                }
            });
        });
    }
}

/**
 * Initialize timer buttons with event handlers
 */
function initTimerButtons() {
    const startTimerButtons = document.querySelectorAll('.start-timer-btn');
    if (startTimerButtons.length > 0) {
        startTimerButtons.forEach(function(button) {
            button.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                const title = this.getAttribute('data-title');
                const estimatedPomodoros = this.getAttribute('data-estimated-pomodoros') || '1';

                // Elements to update
                const timerGoalId = document.getElementById('timer-goal-id');
                const timerGoalTitle = document.getElementById('timer-goal-title');
                const timerEstimatedPomodoros = document.getElementById('timer-estimated-pomodoros');

                if (!timerGoalId || !timerGoalTitle || !timerEstimatedPomodoros) {
                    console.error('Timer modal elements not found');
                    return;
                }

                // Fill modal with data
                timerGoalId.value = id;
                timerGoalTitle.textContent = title;
                timerEstimatedPomodoros.value = estimatedPomodoros;

                // Update estimated completion time
                updateEstimatedCompletionTime();

                // Show modal using Bootstrap's Modal API
                try {
                    const timerModal = new bootstrap.Modal(document.getElementById('startTimerModal'));
                    timerModal.show();
                } catch (error) {
                    console.error('Error showing timer modal:', error);
                }
            });
        });
    }
}

/**
 * Update estimated completion time calculation for timer setup
 */
function updateEstimatedCompletionTime() {
    const timerDuration = document.getElementById('timer-duration');
    const breakDuration = document.getElementById('break-duration');
    const timerEstimatedPomodoros = document.getElementById('timer-estimated-pomodoros');
    const estimatedCompletionTime = document.getElementById('estimated-completion-time');
    const estimatedPomodoroCount = document.getElementById('estimated-pomodoro-count');

    if (!timerDuration || !breakDuration || !timerEstimatedPomodoros ||
        !estimatedCompletionTime || !estimatedPomodoroCount) {
        return;
    }

    const workMinutes = parseInt(timerDuration.value) || 25;
    const breakMinutes = parseInt(breakDuration.value) || 5;
    const pomodoros = parseInt(timerEstimatedPomodoros.value) || 1;

    // Calculate total minutes
    const totalWorkMinutes = workMinutes * pomodoros;
    const totalBreakMinutes = breakMinutes * (pomodoros - 1); // One less break than pomodoros
    const totalMinutes = totalWorkMinutes + totalBreakMinutes;

    // Format as hours and minutes
    let timeDisplay = '';
    if (totalMinutes >= 60) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        timeDisplay = `${hours}h ${minutes > 0 ? minutes + 'm' : ''}`;
    } else {
        timeDisplay = `${totalMinutes}m`;
    }

    estimatedCompletionTime.textContent = timeDisplay;
    estimatedPomodoroCount.textContent = pomodoros;
}

/**
 * Initialize delete account modal with confirmation functionality
 */
function initDeleteAccountModal() {
    const confirmInput = document.getElementById('delete-confirmation');
    const confirmButton = document.getElementById('confirm-delete-btn');

    if (confirmInput && confirmButton) {
        // Initially disable the confirmation button
        confirmButton.disabled = true;

        // Add event listener to enable button only when correct text is entered
        confirmInput.addEventListener('input', function() {
            confirmButton.disabled = confirmInput.value !== 'DELETE';
        });
    }
}

/**
 * Event listener for DOM content loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners for timer duration changes
    const timerDurationSelect = document.getElementById('timer-duration');
    const breakDurationSelect = document.getElementById('break-duration');

    if (timerDurationSelect) {
        timerDurationSelect.addEventListener('change', updateEstimatedCompletionTime);
    }

    if (breakDurationSelect) {
        breakDurationSelect.addEventListener('change', updateEstimatedCompletionTime);
    }
});