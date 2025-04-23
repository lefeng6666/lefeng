/**
 * analytics.js - Client-side JavaScript for analytics visualization
 *
 * This file handles all the analytics data visualization including:
 * - Chart rendering for goal status, focus time, and categories
 * - Heatmap visualization for productivity patterns
 * - Data analysis and insight generation
 */

/**
 * Initialize analytics charts and visualizations
 * @param {Object} analytics - Analytics data from the server
 */
function initAnalytics(analytics) {
    try {
        // Initialize all visualizations
        colorHeatmap();
        generateInsights();
        initializeCharts(analytics);
    } catch (error) {
        console.error('Error initializing analytics:', error);
        displayErrorMessage('There was a problem loading the analytics data.');
    }
}

/**
 * Displays an error message in the analytics view
 * @param {string} message - Error message to display
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
 * Initialize all charts with analytics data
 * @param {Object} analytics - Analytics data from the server
 */
function initializeCharts(analytics) {
    // Goal Status Distribution Chart
    initGoalStatusChart(analytics.statusCounts);

    // Weekly Focus Time Chart
    initWeeklyFocusChart(analytics.dateLabels, analytics.focusData);

    // Category Chart
    initCategoryChart(analytics.categoryData);
}

/**
 * Helper function to create a default chart if no data is available
 * @param {string} chartId - The ID of the canvas element
 * @param {string} type - The chart type (doughnut, bar, etc.)
 * @param {string} title - The chart title
 * @returns {Object} Chart instance
 */
function createDefaultChart(chartId, type, title) {
    const chartElement = document.getElementById(chartId);
    if (!chartElement) {
        console.warn(`Chart element with ID '${chartId}' not found`);
        return null;
    }

    return new Chart(chartElement.getContext('2d'), {
        type: type,
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
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function() {
                            return 'No data available';
                        }
                    }
                },
                title: {
                    display: title ? true : false,
                    text: title || ''
                }
            }
        }
    });
}

/**
 * Initialize goal status distribution chart
 * @param {Object} statusCounts - Goal counts by status
 */
function initGoalStatusChart(statusCounts) {
    const statusLabels = Object.keys(statusCounts || {});
    const statusValues = Object.values(statusCounts || {});
    const statusColors = ['#6c757d', '#007bff', '#28a745'];
    const chartElement = document.getElementById('goalStatusChart');

    if (!chartElement) {
        console.warn('Goal status chart element not found');
        return;
    }

    // Check if we have any data to display
    if (!statusValues.length || statusValues.every(val => val === 0)) {
        createDefaultChart('goalStatusChart', 'doughnut', 'Goal Status');
    } else {
        new Chart(chartElement.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: statusLabels,
                datasets: [{
                    data: statusValues,
                    backgroundColor: statusColors.slice(0, statusLabels.length)
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const total = statusValues.reduce((sum, val) => sum + val, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${context.label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}

/**
 * Initialize weekly focus time chart
 * @param {Array} dateLabels - Array of date labels
 * @param {Array} focusData - Array of focus time data in minutes
 */
function initWeeklyFocusChart(dateLabels, focusData) {
    const chartElement = document.getElementById('weeklyFocusChart');

    if (!chartElement) {
        console.warn('Weekly focus chart element not found');
        return;
    }

    let labels = dateLabels || [];
    let data = focusData || [];

    // Create default date labels if none provided
    if (!labels || labels.length === 0) {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }));
        }
        labels = days;
        data = Array(7).fill(0);
    }

    // Check if we have any non-zero data
    if (!data.length || data.every(val => val === 0)) {
        createDefaultChart('weeklyFocusChart', 'bar', 'Weekly Focus Time');
    } else {
        // Convert minutes to hours for display
        const focusDataInHours = data.map(minutes => Math.round((minutes / 60) * 100) / 100);

        // Weekly Focus Time Chart
        new Chart(chartElement.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Focus Hours',
                    data: focusDataInHours,
                    backgroundColor: '#007bff',
                    borderColor: '#0056b3',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        // Set max value to be 25% more than the highest value, or 4 if all values are low
                        max: Math.max(Math.ceil(Math.max(...focusDataInHours) * 1.25), 4),
                        title: {
                            display: true,
                            text: 'Hours'
                        },
                        ticks: {
                            callback: function(value) {
                                return value + 'h';
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Day'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const hours = context.raw;
                                const minutes = Math.round((hours - Math.floor(hours)) * 60);
                                return `Focus time: ${Math.floor(hours)}h ${minutes}m`;
                            }
                        }
                    }
                }
            }
        });
    }
}

/**
 * Initialize goal categories chart
 * @param {Array} categoryData - Array of category data objects
 */
function initCategoryChart(categoryData) {
    const chartElement = document.getElementById('categoriesChart');

    if (!chartElement) {
        console.warn('Categories chart element not found');
        return;
    }

    let data = categoryData || [];

    // Check if we have any data
    if (!data.length) {
        createDefaultChart('categoriesChart', 'pie', 'Goal Categories');
    } else {
        const categoryLabels = data.map(item => item.category || 'Uncategorized');
        const categoryCounts = data.map(item => item.count);

        // Define a consistent color palette for categories
        const categoryColors = [
            '#4bc0c0', '#ff9f40', '#36a2eb', '#ffcd56', '#ff6384',
            '#c9cbcf', '#9966ff', '#8AC926', '#1982C4', '#6A4C93'
        ];

        new Chart(chartElement.getContext('2d'), {
            type: 'pie',
            data: {
                labels: categoryLabels,
                datasets: [{
                    data: categoryCounts,
                    backgroundColor: categoryColors.slice(0, categoryLabels.length),
                    borderColor: '#ffffff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            boxWidth: 12
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const total = categoryCounts.reduce((sum, val) => sum + val, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${context.label}: ${value} goals (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}

/**
 * Color the productivity heatmap based on focus time intensity
 */
function colorHeatmap() {
    const cells = document.querySelectorAll('.heatmap-cell');
    const maxValue = 90; // Consider 90+ minutes as maximum intensity

    // Define color stops for the gradient
    const colorStops = [
        { threshold: 0, color: '#f8f9fa' },  // Light gray for zero values
        { threshold: 0.01, color: '#dce3f8' }, // Light blue for very low values (>0)
        { threshold: 0.33, color: '#a4c2f4' }, // Medium blue
        { threshold: 0.66, color: '#3d85c6' }  // Dark blue for high values
    ];

    cells.forEach(cell => {
        const value = parseInt(cell.getAttribute('data-value'));

        // Calculate color intensity based on value
        let intensity = Math.min(value / maxValue, 1); // Cap at 1

        // Determine the color based on intensity
        let color = colorStops[0].color; // Default color

        // Find the appropriate color from our defined stops
        for (let i = colorStops.length - 1; i >= 0; i--) {
            if (intensity >= colorStops[i].threshold) {
                color = colorStops[i].color;
                break;
            }
        }

        // Apply the color to the cell
        cell.style.backgroundColor = color;

        // Add a subtle border if there's any value
        if (value > 0) {
            cell.style.border = '1px solid #ccc';
        }
    });
}

/**
 * Generate insights from heatmap data
 */
function generateInsights() {
    const insightsContainer = document.getElementById('heatmap-insights');

    if (!insightsContainer) {
        console.warn('Heatmap insights container not found');
        return;
    }

    // Define day names for reference
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Collect data from the heatmap cells
    const data = [];
    document.querySelectorAll('.heatmap-cell').forEach(cell => {
        const day = parseInt(cell.getAttribute('data-day'));
        const hour = parseInt(cell.getAttribute('data-hour'));
        const value = parseInt(cell.getAttribute('data-value'));

        if (value > 0) {
            data.push({day, hour, value, dayName: dayNames[day]});
        }
    });

    // Handle case with no data
    if (data.length === 0) {
        insightsContainer.innerHTML =
            '<li class="list-group-item">No focus sessions recorded yet. Complete Pomodoro sessions to see your productivity patterns.</li>';
        return;
    }

    // Sort by value to find peak times
    data.sort((a, b) => b.value - a.value);

    // Calculate day totals
    const dayTotals = dayNames.map((_, index) => {
        return {
            day: index,
            dayName: dayNames[index],
            total: data.filter(d => d.day === index).reduce((sum, d) => sum + d.value, 0)
        };
    }).sort((a, b) => b.total - a.total);

    // Calculate hour totals
    const hourTotals = Array(24).fill().map((_, index) => {
        return {
            hour: index,
            total: data.filter(d => d.hour === index).reduce((sum, d) => sum + d.value, 0)
        };
    }).sort((a, b) => b.total - a.total);

    // Generate insights
    const insights = [];

    // Most productive day
    if (dayTotals[0].total > 0) {
        insights.push(`<li class="list-group-item">
            <i class="fas fa-calendar-check text-success"></i>
            Your most productive day is <strong>${dayTotals[0].dayName}</strong> with a total of <strong>${dayTotals[0].total} minutes</strong> of focus time.
        </li>`);
    }

    // Most productive time
    if (hourTotals[0].total > 0) {
        // Format hour for readability
        const hourFormatted = hourTotals[0].hour.toString().padStart(2, '0') + ':00';
        insights.push(`<li class="list-group-item">
            <i class="fas fa-clock text-primary"></i>
            Your peak productivity hour is <strong>${hourFormatted}</strong> with a total of <strong>${hourTotals[0].total} minutes</strong> of focus time.
        </li>`);
    }

    // Most intense single block
    if (data.length > 0) {
        insights.push(`<li class="list-group-item">
            <i class="fas fa-fire text-danger"></i>
            Your most intense focus block is on <strong>${data[0].dayName} at ${data[0].hour}:00</strong> with <strong>${data[0].value} minutes</strong> of focus time.
        </li>`);
    }

    // Morning vs afternoon vs evening vs night
    const morning = data.filter(d => d.hour >= 5 && d.hour < 12).reduce((sum, d) => sum + d.value, 0);
    const afternoon = data.filter(d => d.hour >= 12 && d.hour < 17).reduce((sum, d) => sum + d.value, 0);
    const evening = data.filter(d => d.hour >= 17 && d.hour < 22).reduce((sum, d) => sum + d.value, 0);
    const night = data.filter(d => d.hour >= 22 || d.hour < 5).reduce((sum, d) => sum + d.value, 0);

    const timeOfDay = [
        {name: 'Morning (5am-12pm)', value: morning, icon: 'fa-sun', colorClass: 'text-warning'},
        {name: 'Afternoon (12pm-5pm)', value: afternoon, icon: 'fa-cloud-sun', colorClass: 'text-info'},
        {name: 'Evening (5pm-10pm)', value: evening, icon: 'fa-moon', colorClass: 'text-primary'},
        {name: 'Night (10pm-5am)', value: night, icon: 'fa-stars', colorClass: 'text-secondary'}
    ].sort((a, b) => b.value - a.value);

    if (timeOfDay[0].value > 0) {
        insights.push(`<li class="list-group-item">
            <i class="fas ${timeOfDay[0].icon} ${timeOfDay[0].colorClass}"></i>
            You're most productive during <strong>${timeOfDay[0].name}</strong> with a total of <strong>${timeOfDay[0].value} minutes</strong> of focus time.
        </li>`);
    }

    // Weekday vs weekend comparison
    const weekday = data.filter(d => d.day >= 1 && d.day <= 5).reduce((sum, d) => sum + d.value, 0);
    const weekend = data.filter(d => d.day === 0 || d.day === 6).reduce((sum, d) => sum + d.value, 0);

    if (weekday > 0 || weekend > 0) {
        const weekdayAvg = weekday / 5; // Average per weekday
        const weekendAvg = weekend / 2; // Average per weekend day

        if (weekdayAvg > weekendAvg) {
            const ratio = Math.round((weekdayAvg / weekendAvg) * 10) / 10;
            insights.push(`<li class="list-group-item">
                <i class="fas fa-briefcase text-secondary"></i>
                You focus more on weekdays (<strong>${Math.round(weekdayAvg)} min/day</strong>) than weekends (<strong>${Math.round(weekendAvg)} min/day</strong>), 
                a ${ratio}:1 ratio.
            </li>`);
        } else if (weekendAvg > weekdayAvg) {
            const ratio = Math.round((weekendAvg / weekdayAvg) * 10) / 10;
            insights.push(`<li class="list-group-item">
                <i class="fas fa-home text-info"></i>
                You focus more on weekends (<strong>${Math.round(weekendAvg)} min/day</strong>) than weekdays (<strong>${Math.round(weekdayAvg)} min/day</strong>),
                a ${ratio}:1 ratio.
            </li>`);
        }
    }

    // Add consistency insight if applicable
    const dayCount = dayTotals.filter(day => day.total > 0).length;
    if (dayCount >= 3) {
        insights.push(`<li class="list-group-item">
            <i class="fas fa-calendar-day text-success"></i>
            You've been productive on <strong>${dayCount} different days</strong> of the week, showing good consistency in your focus habits.
        </li>`);
    }

    // Set insights HTML
    insightsContainer.innerHTML = insights.join('');
}

/**
 * Event listener for DOM content loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    // Check if analytics data is available
    const analyticsDataElement = document.getElementById('analytics-data');
    if (analyticsDataElement) {
        try {
            const analytics = JSON.parse(analyticsDataElement.textContent);
            initAnalytics(analytics);
        } catch (error) {
            console.error('Error parsing analytics data:', error);
            displayErrorMessage('Error loading analytics data. Please try refreshing the page.');

            // Initialize with empty data
            initAnalytics({
                statusCounts: {},
                dateLabels: [],
                focusData: [],
                categoryData: []
            });
        }
    } else {
        console.warn('Analytics data element not found');
    }
});