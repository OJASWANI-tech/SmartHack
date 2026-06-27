# ai_app/services/code_analyzer.py

import logging
from typing import Optional

from tree_sitter_language_pack import get_parser

logger = logging.getLogger(__name__)

EXT_MAPPING = {
    ".py": "python",
    ".java": "java",
    ".c": "c",
    ".cpp": "cpp",
    ".cc": "cpp",
    ".js": "javascript",
    ".ts": "typescript",
}

# 🗺️ THE UNIVERSAL INTERMEDIATE VOCABULARY MAP
UNIVERSAL_MAP = {
    # Functions & Methods
    "function_definition": "FUNCTION",
    "method_definition": "FUNCTION",
    "method_declaration": "FUNCTION",
    "arrow_function": "FUNCTION",
    
    # Classes & Structures
    "class_definition": "CLASS",
    "class_declaration": "CLASS",
    "struct_specifier": "CLASS",
    
    # Conditionals
    "if_statement": "IF",
    "else_clause": "ELSE",
    "else_statement": "ELSE",
    "switch_statement": "SWITCH",
    "switch_case": "CASE",
    
    # Loops
    "for_statement": "LOOP",
    "while_statement": "LOOP",
    "do_statement": "LOOP",
    "for_in_statement": "LOOP",
    
    # Control Flow & Terminal Nodes
    "return_statement": "RETURN",
    "break_statement": "BREAK",
    "continue_statement": "CONTINUE",
    "throw_statement": "THROW",
    
    # Operations & Invocation
    "call": "CALL",
    "call_expression": "CALL",
    "assignment_expression": "ASSIGN",
    "expression_statement": "EXPR",
    "binary_expression": "BINARY_OP",
}


def extract_structural_tokens(source_code: str, file_extension: str) -> Optional[str]:
    if not source_code:
        return None

    language = EXT_MAPPING.get(file_extension.lower())
    if not language:
        return None

    try:
        parser = get_parser(language)
        tree = parser.parse(source_code)
        root = tree.root_node
        if callable(root):
            root = root()

        tokens = []

        # 🚶‍♂️ FULL AST TRAVERSAL WITH NOISE FILTERING
        def walk(node):
            if node is None:
                return

            # Resolve the raw token kind cleanly
            node_kind = node.kind
            if callable(node_kind):
                node_kind = node_kind()
            
            raw_token = str(node_kind)
            
            # 🎯 FIX: Only extract structural blocks tracked in the universal map.
            # This strips away underlying background noise unique to individual language compilers.
            if raw_token in UNIVERSAL_MAP:
                tokens.append(UNIVERSAL_MAP[raw_token])

            # Continue deep tree traversal recursively
            count = node.child_count
            if callable(count):
                count = count()

            for i in range(count):
                next_child = node.child(i)
                if callable(next_child):
                    next_child = next_child()
                walk(next_child)

        walk(root)

        logger.info(
            f"Successfully Parsed {language} AST Architecture: "
            f"universal_nodes_extracted={len(tokens)}"
        )

        return " ".join(tokens) if tokens else None

    except Exception as e:
        logger.error(f"Tree-sitter universal normalization failed: {e}", exc_info=True)
        return None