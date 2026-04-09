def action_plan(attendance, internals, backlogs):
    plan = []

    if attendance < 75:
        plan.append("Month 1: Improve attendance above 80%")

    if internals < 70:
        plan.append("Month 2: Focus on academics and internals")

    if backlogs > 0:
        plan.append("Month 3: Clear all backlogs")

    plan.append("Month 4: Practice DSA daily")
    plan.append("Month 5: Build 2 projects")
    plan.append("Month 6: Mock interviews and aptitude")

    return plan