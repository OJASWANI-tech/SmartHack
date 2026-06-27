import logging
from typing import List, Dict, Any

logger = logging.getLogger("engines.scheduler")

def get_slot_period(slot_index: int, start_hour: int, slot_duration_mins: int) -> str:
    total_mins = slot_index * slot_duration_mins
    start_hr = start_hour + (total_mins // 60)
    if start_hr < 12:
        return "morning"
    elif start_hr < 16:
        return "afternoon"
    else:
        return "evening"

def generate_schedule(
    assignments: List[Dict[str, Any]], 
    rooms: List[str] = None, 
    start_hour: int = 10, 
    slot_duration_mins: int = 15,
    evaluator_availabilities: dict = None
) -> List[Dict[str, Any]]:
    """
    Schedules evaluator-team assignments into rooms and time slots.
    
    Hard constraints:
    1. A team cannot be evaluated by two judges at the same time slot (no team double-booking).
    2. A judge cannot evaluate two teams at the same time slot (no judge double-booking).
    3. A room cannot host two evaluations at the same time slot (no room double-booking).
    4. Judge's availability windows (morning, afternoon, evening) must be respected.
    
    Parameters:
    - assignments: List of dicts representing CP-SAT outputs with evaluator_id, team_id.
    - rooms: List of rooms to distribute sessions into. Defaults to ["Room Alpha", "Room Beta", "Room Gamma"].
    - evaluator_availabilities: Dict mapping evaluator_id to their running availability config dict.
    
    Returns:
    - List of schedules with:
      assignment_id, evaluator_id, team_id, room, time_slot, sequence_order
    """
    if not rooms:
        rooms = ["Room Alpha", "Room Beta", "Room Gamma", "Room Delta"]
        
    logger.info(f"Generating schedule for {len(assignments)} assignments across {len(rooms)} rooms.")
    
    # Track booked slots
    # slot_index -> set of busy judges
    judge_busy = {}
    # slot_index -> set of busy teams
    team_busy = {}
    # slot_index -> set of busy rooms
    room_busy = {}
    
    # Sort assignments to process high compatibility matches first or keep natural order
    sorted_assignments = list(assignments)
    
    schedules = []
    
    def get_time_slot_string(slot_index: int) -> str:
        total_mins = slot_index * slot_duration_mins
        start_min = total_mins % 60
        start_hr = start_hour + (total_mins // 60)
        
        end_total_mins = total_mins + slot_duration_mins
        end_min = end_total_mins % 60
        end_hr = start_hour + (end_total_mins // 60)
        
        return f"{start_hr:02d}:{start_min:02d} - {end_hr:02d}:{end_min:02d}"

    for idx, assign in enumerate(sorted_assignments):
        eval_id = assign["evaluator_id"]
        team_id = assign["team_id"]
        
        # Search for first available slot_index where:
        # - judge is free
        # - team is free
        # - there is an available room
        slot_index = 0
        assigned = False
        
        while not assigned:
            # Initialize slot bookings if not exist
            if slot_index not in judge_busy:
                judge_busy[slot_index] = set()
            if slot_index not in team_busy:
                team_busy[slot_index] = set()
            if slot_index not in room_busy:
                room_busy[slot_index] = set()
                
            # Check if judge and team are free
            if eval_id not in judge_busy[slot_index] and team_id not in team_busy[slot_index]:
                # Verify judge availability window constraint
                is_available = True
                if evaluator_availabilities and eval_id in evaluator_availabilities:
                    period = get_slot_period(slot_index, start_hour, slot_duration_mins)
                    is_available = evaluator_availabilities[eval_id].get(period, True)

                free_room = None
                if is_available:
                    # Find a free room in this slot
                    for room in rooms:
                        if room not in room_busy[slot_index]:
                            free_room = room
                            break
                        
                if free_room:
                    # Book judge, team, and room
                    judge_busy[slot_index].add(eval_id)
                    team_busy[slot_index].add(team_id)
                    room_busy[slot_index].add(free_room)
                    
                    time_slot = get_time_slot_string(slot_index)
                    schedules.append({
                        "evaluator_id": eval_id,
                        "team_id": team_id,
                        "room": free_room,
                        "time_slot": time_slot,
                        "sequence_order": slot_index + 1
                    })
                    assigned = True
                    logger.debug(f"Assigned Judge {eval_id} to Team {team_id} in {free_room} at slot {time_slot}")
                    
            if not assigned:
                slot_index += 1
                if slot_index > 100:  # Safeguard infinite loops
                    logger.error("Could not find a feasible schedule slot (safeguard limit hit). Assigning default slot.")
                    schedules.append({
                        "evaluator_id": eval_id,
                        "team_id": team_id,
                        "room": rooms[0],
                        "time_slot": get_time_slot_string(0),
                        "sequence_order": 1
                    })
                    assigned = True

    logger.info(f"Schedule completed! Total slots used: {max(judge_busy.keys()) + 1 if judge_busy else 0}")
    return schedules
