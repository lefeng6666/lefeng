// controllers/analyticsController.js
const pool = require('../config/db');
const moment = require('moment');

// Get analytics data
exports.getAnalytics = async (req, res) => {
    try {
        // Get goal statistics
        const [statusCounts] = await pool.query(
            'SELECT status, COUNT(*) as count FROM goals WHERE user_id = ? GROUP BY status',
            [req.user.id]
        );

        // Get Pomodoro statistics
        const [totalSessions] = await pool.query(
            'SELECT COUNT(*) as count FROM pomodoro_sessions WHERE user_id = ? AND completed = true',
            [req.user.id]
        );

        const [totalFocusTime] = await pool.query(
            'SELECT SUM(TIMESTAMPDIFF(SECOND, start_time, end_time)) as seconds FROM pomodoro_sessions WHERE user_id = ? AND completed = true',
            [req.user.id]
        );

        // Get category distribution
        const [categoryData] = await pool.query(
            'SELECT COALESCE(category, "Uncategorized") as category, COUNT(*) as count FROM goals WHERE user_id = ? GROUP BY category',
            [req.user.id]
        );

        // Get weekly focus time
        const [weeklyFocus] = await pool.query(
            `SELECT 
                DATE_FORMAT(start_time, '%Y-%m-%d') as date,
                SUM(TIMESTAMPDIFF(SECOND, start_time, end_time)) / 60 as minutes
            FROM pomodoro_sessions 
            WHERE user_id = ? AND completed = true 
                AND start_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE_FORMAT(start_time, '%Y-%m-%d')
            ORDER BY date`,
            [req.user.id]
        );

        // Get goal completion trend
        const [completionTrend] = await pool.query(
            `SELECT 
                DATE_FORMAT(created_at, '%Y-%m-%d') as date,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed
            FROM goals
            WHERE user_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
            ORDER BY date`,
            [req.user.id]
        );

        // Get focus pattern heatmap data (by hour of day and day of week)
        const [focusHeatmapData] = await pool.query(
            `SELECT 
                HOUR(start_time) as hour_of_day,
                DAYOFWEEK(start_time) as day_of_week,
                COUNT(*) as session_count,
                SUM(TIMESTAMPDIFF(SECOND, start_time, end_time)) / 60 as total_minutes
            FROM pomodoro_sessions 
            WHERE user_id = ? AND completed = true 
                AND start_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY HOUR(start_time), DAYOFWEEK(start_time)
            ORDER BY day_of_week, hour_of_day`,
            [req.user.id]
        );

        // Transform the data for the heatmap
        // Initialize 7x24 grid with zeros (7 days, 24 hours)
        const heatmapData = Array(7).fill().map(() => Array(24).fill(0));

        // Fill in the data from our query
        focusHeatmapData.forEach(entry => {
            // MySQL's DAYOFWEEK() returns 1 for Sunday, 2 for Monday, etc.
            const dayIndex = entry.day_of_week - 1;
            const hourIndex = entry.hour_of_day;

            // Some database systems might return out-of-bounds indices
            if (dayIndex >= 0 && dayIndex < 7 && hourIndex >= 0 && hourIndex < 24) {
                heatmapData[dayIndex][hourIndex] = (entry.total_minutes);
            }
        });

        // Format data for rendering
        const analytics = {
            statusCounts: statusCounts.reduce((acc, curr) => {
                acc[curr.status] = curr.count;
                return acc;
            }, { Pending: 0,  Completed: 0 }),
            totalSessions: totalSessions[0].count || 0,
            totalFocusTime: Math.floor((totalFocusTime[0].seconds || 0) / 60), // Convert to minutes
            totalFocusHours: Math.floor((totalFocusTime[0].seconds || 0) / 3600), // Convert to hours
            categoryData: categoryData,
            completionTrend: completionTrend,
            weeklyFocus: weeklyFocus,
            heatmapData: heatmapData
        };

        // Generate date labels for the last 7 days
        const dateLabels = [];
        const focusData = [];

        for (let i = 6; i >= 0; i--) {
            const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
            dateLabels.push(moment().subtract(i, 'days').format('MM/DD'));

            const focusDay = weeklyFocus.find(day => day.date === date);
            focusData.push(focusDay ? Math.round(focusDay.minutes) : 0);
        }

        analytics.dateLabels = dateLabels;
        analytics.focusData = focusData;

        console.log('Analytics data being sent to template:', analytics);

        res.render('analytics', {
            analytics,
            user: req.user,
            moment
        });
    } catch (err) {
        console.error('Error fetching analytics data:', err);
        req.flash('error_msg', 'Failed to load analytics');
        res.redirect('/dashboard');
    }
};

// Get productivity score
exports.getProductivityScore = async (req, res) => {
    try {
        // Base metrics - Goal completion rate
        const [completed] = await pool.query(
            'SELECT COUNT(*) as count FROM goals WHERE user_id = ? AND status = "Completed"',
            [req.user.id]
        );

        const [total] = await pool.query(
            'SELECT COUNT(*) as count FROM goals WHERE user_id = ?',
            [req.user.id]
        );

        const completionRate = total[0].count > 0 ?
            (completed[0].count / total[0].count) * 100 : 0;

        // Daily consistency
        const [sessions] = await pool.query(
            `SELECT 
                DATE(start_time) as date,
                COUNT(*) as count
            FROM pomodoro_sessions
            WHERE user_id = ? AND completed = true AND start_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(start_time)`,
            [req.user.id]
        );

        const daysWithSessions = sessions.length;
        const consistencyRate = (daysWithSessions / 7) * 100;

        // Focus duration factor
        const [totalFocusTime] = await pool.query(
            `SELECT SUM(TIMESTAMPDIFF(SECOND, start_time, end_time)) as seconds 
             FROM pomodoro_sessions
             WHERE user_id = ? AND completed = true AND start_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
            [req.user.id]
        );

        const focusMinutes = Math.floor((totalFocusTime[0].seconds || 0) / 60);
        const dailyFocusAvg = focusMinutes / 7; // Average minutes per day

        // Normalize to 0-100 scale (assuming 120 min/day is excellent)
        const focusDurationScore = Math.min(100, (dailyFocusAvg / 120) * 100);

        // Focus session completion rate
        const [sessionStats] = await pool.query(
            `SELECT 
                COUNT(*) as total_sessions,
                SUM(CASE WHEN completed = true THEN 1 ELSE 0 END) as completed_sessions
             FROM pomodoro_sessions
             WHERE user_id = ? AND start_time >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)`,
            [req.user.id]
        );

        const sessionCompletionRate = sessionStats[0].total_sessions > 0 ?
            (sessionStats[0].completed_sessions / sessionStats[0].total_sessions) * 100 : 100;

        // Goal timeliness (completing goals before deadlines)
        const [goalTimeliness] = await pool.query(
            `SELECT 
                COUNT(*) as total_goals_with_deadline,
                SUM(CASE WHEN status = 'Completed' AND deadline >= CURDATE() THEN 1 ELSE 0 END) as completed_on_time
             FROM goals
             WHERE user_id = ? AND deadline IS NOT NULL`,
            [req.user.id]
        );

        const timelinessRate = goalTimeliness[0].total_goals_with_deadline > 0 ?
            (goalTimeliness[0].completed_on_time / goalTimeliness[0].total_goals_with_deadline) * 100 : 100;

        // Calculate composite score with new weights
        const productivityScore = Math.round(
            (completionRate * 0.30) +         // 30% goal completion
            (consistencyRate * 0.25) +        // 25% daily consistency
            (focusDurationScore * 0.20) +     // 20% focus duration
            (sessionCompletionRate * 0.15) +  // 15% session completion
            (timelinessRate * 0.10)           // 10% goal timeliness
        );

        // Generate interpretation and recommendations
        let interpretation = "";
        let recommendations = [];

        if (productivityScore >= 90) {
            interpretation = "Exceptional productivity";
            recommendations = [
                "Continue your excellent work habits",
                "Consider mentoring others with your productivity system",
                "Explore advanced goal-setting techniques"
            ];
        } else if (productivityScore >= 75) {
            interpretation = "Very good productivity";
            recommendations = [
                "Focus on maintaining your consistent habits",
                "Look for small optimization opportunities",
                "Consider increasing challenge level for goals"
            ];
        } else if (productivityScore >= 60) {
            interpretation = "Good productivity with room for improvement";
            recommendations = [
                "Increase daily consistency with shorter sessions",
                "Review your goal deadlines for better planning",
                "Complete your Pomodoro sessions without interruptions"
            ];
        } else if (productivityScore >= 40) {
            interpretation = "Moderate productivity";
            recommendations = [
                "Establish a daily focus routine, even if brief",
                "Break down larger goals into manageable tasks",
                "Increase session completion rate by setting realistic durations"
            ];
        } else {
            interpretation = "Productivity system needs attention";
            recommendations = [
                "Start with just 1-2 focus sessions daily",
                "Set fewer, more achievable goals",
                "Use shorter Pomodoro sessions (15-20 minutes)"
            ];
        }

        // Component scores for transparency
        const componentScores = {
            completionRate: Math.round(completionRate),
            consistencyRate: Math.round(consistencyRate),
            focusDurationScore: Math.round(focusDurationScore),
            sessionCompletionRate: Math.round(sessionCompletionRate),
            timelinessRate: Math.round(timelinessRate)
        };

        res.json({
            score: productivityScore,
            interpretation: interpretation,
            recommendations: recommendations,
            componentScores: componentScores
        });
    } catch (err) {
        console.error('Error calculating productivity score:', err);
        res.status(500).json({ error: 'Failed to calculate productivity score' });
    }
};