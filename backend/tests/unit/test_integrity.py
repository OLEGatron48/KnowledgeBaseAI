from src.services.integrity import check_prereq_cycles, check_dangling_skills, integrity_check_subgraph

def test_prereq_cycle_detection():
    rels = [
        {"type": "PREREQ", "from_uid": "A", "to_uid": "B"},
        {"type": "PREREQ", "from_uid": "B", "to_uid": "C"},
        {"type": "PREREQ", "from_uid": "C", "to_uid": "A"},
    ]
    cycles = check_prereq_cycles(rels)
    assert len(cycles) >= 3

def test_dangling_skills_detection():
    nodes = [
        {"type": "Skill", "uid": "S1"},
        {"type": "Skill", "uid": "S2"},
        {"type": "Concept", "uid": "C1"},
    ]
    rels = [
        {"type": "BASED_ON", "from_uid": "S1", "to_uid": "C1"},
    ]
    dangling = check_dangling_skills(nodes, rels)
    assert dangling == ["S2"]

def test_integrity_check_subgraph():
    nodes = [{"type": "Skill", "uid": "S1"}, {"type": "Concept", "uid": "C1"}]
    rels = [{"type": "BASED_ON", "from_uid": "S1", "to_uid": "C1"}]
    res = integrity_check_subgraph(nodes, rels)
    assert res["ok"] is True
