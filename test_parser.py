# test_parser.py
from tree_sitter_language_pack import get_parser

parser = get_parser("python")

tree = parser.parse("""
def hello():
    print("hi")
""")

root = tree.root_node
if callable(root):
    root = root()

tokens = []

def walk(node):
    if node is None:
        return
    
    # Safely evaluate node type token strings
    node_kind = node.kind
    if callable(node_kind):
        node_kind = node_kind()
    tokens.append(str(node_kind))
    
    count = node.child_count
    if callable(count):
        count = count()
        
    for i in range(count):
        child_node = node.child(i)
        if callable(child_node):
            child_node = child_node()
        walk(child_node)

walk(root)

print("--- 🎯 FINAL PIPELINE SUCCESS ---")
print(f"Successfully collected {len(tokens)} token entries!")
print("\n📋 Token Sequence Fingerprint:")
print(" ".join(tokens))