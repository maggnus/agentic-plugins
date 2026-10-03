# Methodological and scientific foundations

Reviewed: 2026-10-03. This is a bounded literature synthesis for an experimental release. Sources support specific statements; the resulting method is an engineering hypothesis requiring separate evaluation. No source establishes universal acceleration or architectural quality on arbitrary codebases.

## Evidence register

| ID and source | Evidence type and material examined | Supported observation | Limit of inference |
| --- | --- | --- | --- |
| S1. James Martin, *Rapid Application Development*, 1991; [bibliographic record](https://books.google.com/books?id=o6FQAAAAMAAJ) | Historical source; bibliographic record and available contents only | The book establishes the historical reference for this adaptation | The complete book was not obtained; no detailed normative rule is attributed to unread chapters |
| S2. [DSDM Agile Project Framework Handbook](https://www.agilebusiness.org/wp-content/uploads/2026/05/DSDM-Agile-Project-Framework-Handbook.pdf), originally 2014 | Primary methodology; principles, lifecycle, quality criteria, iterative development and timeboxing sections | Quality is agreed early; development is iterative, time-bounded and supported by sufficient foundations and collaboration | A normative framework is not a causal experiment demonstrating this plugin's productivity |
| S3. Barry W. Boehm, [A Spiral Model of Software Development and Enhancement](https://www.cs.hmc.edu/~markk/SWE_copies/boehmspiral.pdf), 1988 | Original paper; process model and risk-driven cycle | The next activity can be selected by uncertainty and risk rather than a fixed document sequence | Historical examples do not determine modern agent scheduling or numerical budgets |
| S4. D. L. Parnas, [On the Criteria to Be Used in Decomposing Systems into Modules](https://doi.org/10.1145/361598.361623), 1972 | Original publication record and abstract; full-text access was unavailable | Module boundaries affect flexibility and comprehensibility; decomposition criteria matter | File separation alone does not prove semantic independence or an optimal decomposition |
| S5. John D. C. Little, [A Proof for the Queuing Formula: L = λW](https://pubsonline.informs.org/doi/abs/10.1287/opre.9.3.383), 1961 | Mathematical result; theorem statement and assumptions | Under the stated stationary-process assumptions, average work in a system relates to arrival rate and residence time | Finite development trials need not be stationary; the theorem does not calculate an optimal number of agents |
| S6. Forsgren et al., [The SPACE of Developer Productivity](https://www.microsoft.com/en-us/research/publication/the-space-of-developer-productivity-theres-more-to-it-than-you-think/), 2021 | Primary research framework; authors' description | Productivity has multiple dimensions and cannot be identified with individual activity alone | Human satisfaction and organizational measures cannot simply be assigned to agents |
| S7. METR, [Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity](https://arxiv.org/html/2507.09089v1), 2025 | Randomized study; design, results and generalization discussion | In its setting, experienced developers completed tasks more slowly with the tested assistance despite expectations of speedup | Models, developer familiarity and task selection constrain transfer to current autonomous agents |
| S8. METR, [Experiment-design update](https://metr.org/blog/2026-02-24-uplift-update/), 2026 | Primary follow-up analysis | Selection effects and concurrent agent use complicate interpretation of later time measurements | The update does not supply a reliable universal effect size for current tools |
| S9. Kim et al., [Towards a Science of Scaling Agent Systems, v3](https://arxiv.org/html/2512.08296v3), 2026 | Controlled architecture comparisons; methods, sensitivity analysis and limitations | Coordination benefit varies with task structure and baseline capability; some apparent patterns weaken under corrected inference | Canonical architectures, limited coding subsets and prompt choices do not establish a plugin-specific optimum |
| S10. Cemri et al., [Why Do Multi-Agent LLM Systems Fail?, v2](https://arxiv.org/html/2503.13657v2), 2025 | Empirical failure taxonomy; annotated traces, intervention studies and verification failures | Failures involve specification, alignment and verification, including premature termination and insufficient checking | Classification is not a guarantee that a proposed rule prevents every failure |
| S11. Yang et al., [SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering, v3](https://arxiv.org/html/2405.15793v3), 2024 | Original system paper; interface design and evaluation | Tool interface design affects observed software-engineering performance | Results for a specific system and tasks do not establish general architectural quality |
| S12. DORA, [State of AI-assisted Software Development 2025](https://dora.dev/research/2025/dora-report/) | Primary report overview | AI adoption interacts with the surrounding delivery system; throughput and stability must be distinguished | Observational associations do not establish causation for this method; the full report was not analyzed here |

The historical four-phase labels are vocabulary for organizing this adaptation. Operational requirements derive from the explicitly reviewed methodology and research, combined with the design choices below. The unread Martin chapters and unexamined DORA report sections remain research limitations.

## Interpretation and design traceability

| Design decision | Basis | Operational rule | Falsifying check |
| --- | --- | --- | --- |
| Bound outcome and quality before implementation | S2; engineering adaptation | Frame acceptance, invariants, exclusions and budget | Reject an outcome that meets a deadline but violates its invariant |
| Investigate consequential uncertainty first | S3; engineering adaptation | Run a discriminating experiment before dependent work | Compare total overhead and avoided rework with a comparable baseline |
| Separate semantic contracts from file ownership | S4; engineering adaptation | Order shared-contract changes before consumers | Combine individually valid changes and exercise consumers |
| Limit concurrency by acceptance capacity | S5, S9; hypothesis | Increase concurrency only for independent outcomes and reduce it on queueing or conflict | Compare elapsed time, total effort and correction cost across concurrency levels |
| Bind evidence to requirements and revision | S10; engineering adaptation | Recheck affected evidence after base or requirement changes | Present an old successful report for a changed revision |
| Measure complete delivery rather than activity | S6, S7, S8, S12 | Record elapsed time, human effort, model cost, waiting, rework and acceptance | Include failed and unfinished runs instead of comparing only successful coding intervals |
| Use independent and discriminating acceptance | S10; engineering adaptation | Exercise actual behavior and failure paths rather than trusting reports | Submit a change whose existing tests pass while contracted behavior fails |
| Treat context and interface as experimental factors | S9, S11 | Record tools, settings, context and tested scope | Repeat a task while varying one factor and preserve other conditions |

## Transfer limits

RAD is not reduced to generation speed. Product feedback, architectural constraints and operational acceptance are distinct observations. Short cycles do not remove the need to investigate shared schemas, mixed-version compatibility or recovery.

Adding agents changes communication, context and total resource use as well as elapsed time. An equal-time comparison and an equal-cost comparison answer different questions. Correlated author and reviewer errors require behavioral checks with an independent source of expected behavior.

A repository larger than an agent's context requires selective investigation; successful selective investigation on one task does not demonstrate coverage of all consumers or long-term architectural preservation. The first release therefore states measured feasibility separately from acceleration and scalability hypotheses.
