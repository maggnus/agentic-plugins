# Bounded framework outcome
Base revision: 7847227a3fecde4b2a169552b84c60c6286b6025. Workspace: <isolated Django workspace>.
This is an isolated evaluation; no upstream publication or product deployment is requested.
Add keyword-only max_length=None to django.utils.text.slugify. Existing calls and results remain unchanged when max_length is None.
When supplied, max_length is a positive integer excluding bool. Reject other types with TypeError and zero or negative integers with ValueError.
After existing normalization, return at most max_length code points, removing trailing hyphens and underscores introduced by truncation.
Preserve allow_unicode and lazy-input behavior. Add tests for compatibility, ASCII and Unicode truncation, separator edges, invalid arguments and lazy values, and update the function's existing documentation.
Allowed writes: django/utils/text.py, tests/utils_tests/test_text.py, docs/ref/utils.txt. Other paths are protected.
Use one implementer. Record tested consumers and unchanged assumptions. Perform targeted project tests and provide real commands, exit statuses, base and result revisions, scope and limitations. Do not introduce dependencies or change architecture.
Required work is implementation and local verification. A local commit is permitted; integration into any upstream branch and delivery are not authorized.
