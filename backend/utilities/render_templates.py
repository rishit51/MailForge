import re

pattern = re.compile(r"\{\{(\w+)\}\}")

def render_template(template: str, data: dict) -> str:
    def replace(match):
        key = match.group(1)
        return str(data.get(key, ""))
    return pattern.sub(replace, template)