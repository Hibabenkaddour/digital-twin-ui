"""
utils/formula.py — Validation des formules KPI avant évaluation numexpr.
Vérifie que la formule est une expression arithmétique sûre utilisant
uniquement des colonnes autorisées et des fonctions mathématiques connues.
"""
import ast

_SAFE_FUNCTIONS = {
    "sin", "cos", "tan", "abs", "sqrt", "exp", "log", "log10",
    "ceil", "floor", "round", "min", "max", "where",
}

_SAFE_NODE_TYPES = (
    ast.Expression, ast.BinOp, ast.UnaryOp, ast.Compare, ast.BoolOp,
    ast.Constant, ast.Name, ast.Call,
    ast.Add, ast.Sub, ast.Mul, ast.Div, ast.FloorDiv, ast.Mod, ast.Pow,
    ast.USub, ast.UAdd,
    ast.Gt, ast.Lt, ast.GtE, ast.LtE, ast.Eq, ast.NotEq,
    ast.And, ast.Or, ast.Not,
    ast.Load,
)


def validate_formula(formula: str, allowed_columns: list) -> tuple:
    """
    Retourne (is_valid: bool, error_message: str).
    Accepte uniquement les expressions arithmétiques utilisant des colonnes
    connues et des fonctions mathématiques de base.
    """
    if not formula or not formula.strip():
        return False, "La formule ne peut pas être vide"

    if len(formula) > 500:
        return False, "Formule trop longue (max 500 caractères)"

    try:
        tree = ast.parse(formula.strip(), mode="eval")
    except SyntaxError as e:
        return False, f"Erreur de syntaxe : {e.msg}"

    allowed_set = set(allowed_columns)

    for node in ast.walk(tree):
        if not isinstance(node, _SAFE_NODE_TYPES):
            return False, f"Opération non autorisée dans la formule : {type(node).__name__}"

        if isinstance(node, ast.Name):
            if node.id not in allowed_set and node.id not in _SAFE_FUNCTIONS:
                return False, (
                    f"Variable inconnue '{node.id}' — "
                    f"colonnes autorisées : {', '.join(sorted(allowed_set))}"
                )

        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Attribute):
                return False, "L'accès aux attributs n'est pas autorisé dans les formules"
            if isinstance(node.func, ast.Name) and node.func.id not in _SAFE_FUNCTIONS:
                return False, f"Fonction '{node.func.id}' non autorisée"

    return True, ""
