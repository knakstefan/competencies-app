import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * One-time seed mutation that adds AI-specific sub-competencies
 * to the Product Designer competency framework.
 *
 * Run from the Convex dashboard or via:
 *   npx convex run --component seedAICompetencies:default
 *
 * Idempotent — skips any sub-competency that already exists (matched by title).
 */

const AI_SUB_COMPETENCIES: {
  /** Substring to match against competency title (case-insensitive) */
  competencyMatch: string;
  subTitle: string;
  levelCriteria: Record<string, string[]>;
}[] = [
  {
    competencyMatch: "product thinking",
    subTitle: "AI-Augmented Product Thinking",
    levelCriteria: {
      p1_entry: [
        "Uses AI tools to summarize research findings and competitor information",
        "Explores AI-generated ideas as a starting point for design concepts",
        "Follows established prompt patterns to extract basic product insights from AI tools",
        "Understands when AI suggestions are relevant vs. off-target for a given problem",
      ],
      p2_developing: [
        "Applies AI to accelerate competitive analysis and identify market patterns",
        "Uses AI to generate and stress-test multiple product hypotheses",
        "Crafts effective prompts to extract meaningful product insights from AI tools",
        "Evaluates AI-generated recommendations against user needs and business goals",
      ],
      p3_career: [
        "Integrates AI into the product thinking workflow to rapidly explore problem spaces",
        "Uses AI to identify edge cases, accessibility considerations, and unmet user needs",
        "Critically evaluates AI outputs and iterates on prompts to improve relevance",
        "Combines AI insights with qualitative research to strengthen prioritization decisions",
      ],
      p4_advanced: [
        "Develops AI-augmented product strategy frameworks adopted by the team",
        "Identifies opportunities where AI can transform product discovery processes",
        "Mentors others on leveraging AI for product thinking and prioritization",
        "Balances AI efficiency with human judgment in strategic product decisions",
      ],
      p5_principal: [
        "Shapes the organization's approach to AI-augmented product strategy",
        "Pioneers novel AI-assisted methods for identifying market opportunities",
        "Publishes or presents on AI-enhanced product thinking methodologies",
        "Drives cross-functional adoption of AI tools for product decision-making",
      ],
    },
  },
  {
    competencyMatch: "visual, interaction",
    subTitle: "AI-Augmented Design Execution",
    levelCriteria: {
      p1_entry: [
        "Uses AI tools to generate initial visual explorations and design variations",
        "Applies AI to draft and iterate on UI copy and microcopy",
        "Follows established prompt patterns to generate basic design alternatives",
        "Recognizes the difference between AI-generated output and production-ready design",
      ],
      p2_developing: [
        "Leverages AI to rapidly explore layout options, color palettes, and typography",
        "Iterates on AI-generated content to match brand voice and UX writing standards",
        "Uses AI to generate interaction patterns and evaluate alternatives",
        "Adapts AI outputs to align with existing design system components and patterns",
      ],
      p3_career: [
        "Integrates AI into the design workflow for rapid prototyping and iteration cycles",
        "Uses AI to generate accessible design alternatives and identify inclusivity gaps",
        "Develops effective prompt strategies for consistent, high-quality design outputs",
        "Critically curates AI-generated work, applying design judgment to refine results",
      ],
      p4_advanced: [
        "Creates AI-enhanced design workflows that elevate team productivity and quality",
        "Develops reusable prompt libraries and AI templates for common design patterns",
        "Mentors designers on effective use of AI for visual, interaction, and content design",
        "Pushes the boundaries of AI-assisted design while maintaining craft standards",
      ],
      p5_principal: [
        "Defines the organization's vision for AI-augmented design execution",
        "Pioneers new AI-design methodologies that influence industry practice",
        "Establishes quality standards for AI-assisted design outputs across the organization",
        "Drives strategic partnerships with AI tool providers to advance design capabilities",
      ],
    },
  },
  {
    competencyMatch: "ux research",
    subTitle: "AI-Augmented Research & Insights",
    levelCriteria: {
      p1_entry: [
        "Uses AI to assist with note-taking, transcription, and basic data organization",
        "Applies AI to summarize research sessions and identify preliminary themes",
        "Follows established AI-assisted research workflows set up by the team",
        "Understands the limitations of AI-generated insights vs. direct user evidence",
      ],
      p2_developing: [
        "Leverages AI to synthesize research data and surface patterns across sessions",
        "Uses AI to draft discussion guides, survey questions, and research plans",
        "Applies AI to competitive UX analysis and benchmark comparisons",
        "Validates AI-generated insights against primary research data",
      ],
      p3_career: [
        "Develops AI-augmented research workflows that scale qualitative insights",
        "Uses AI to identify gaps in research coverage and suggest follow-up studies",
        "Combines AI pattern recognition with human empathy to generate deeper insights",
        "Creates structured prompt strategies for consistent research synthesis",
      ],
      p4_advanced: [
        "Designs AI-augmented research frameworks adopted across teams",
        "Mentors researchers on responsible use of AI in user research contexts",
        "Evaluates emerging AI research tools and integrates the most valuable into practice",
        "Identifies strategic opportunities where AI can amplify research impact",
      ],
      p5_principal: [
        "Shapes the organization's research strategy around AI capabilities and ethics",
        "Pioneers AI-assisted methods for large-scale research synthesis and trend identification",
        "Establishes governance principles for AI use in research to ensure rigor and ethics",
        "Advances industry understanding of AI-augmented UX research through thought leadership",
      ],
    },
  },
  {
    competencyMatch: "technical fluency",
    subTitle: "AI Tools & Technical Literacy",
    levelCriteria: {
      p1_entry: [
        "Has working familiarity with common AI design tools and their core capabilities",
        "Understands basic AI concepts relevant to design (prompting, generation, iteration)",
        "Can follow established AI-assisted workflows set up by the team",
        "Explores new AI tools with curiosity and shares findings with peers",
      ],
      p2_developing: [
        "Effectively uses multiple AI tools across the design workflow",
        "Understands the strengths, limitations, and appropriate use cases for each AI tool",
        "Creates and refines prompts to achieve specific design outcomes",
        "Stays current with new AI tools and features relevant to design work",
      ],
      p3_career: [
        "Develops custom AI workflows and prompt templates for recurring design tasks",
        "Understands how AI models work at a conceptual level to better leverage their capabilities",
        "Contributes to team documentation and best practices for AI tool usage",
        "Evaluates and recommends AI tools for team adoption based on design needs",
      ],
      p4_advanced: [
        "Develops AI integration strategies that improve team-wide design operations",
        "Creates training materials and onboarding resources for AI tools in the design workflow",
        "Mentors designers on technical AI fluency and effective tool adoption",
        "Collaborates with engineering to identify AI-powered design solutions",
      ],
      p5_principal: [
        "Shapes the organization's AI tooling strategy and investment decisions",
        "Evaluates emerging AI technologies for their potential design applications",
        "Drives cross-functional AI literacy initiatives between design, product, and engineering",
        "Contributes to industry standards and discourse on AI tools for design professionals",
      ],
    },
  },
  {
    competencyMatch: "design systems",
    subTitle: "AI-Augmented Design Systems",
    levelCriteria: {
      p1_entry: [
        "Uses AI tools to document and catalog design system components",
        "Applies AI to identify inconsistencies between designs and the design system",
        "Understands how AI can assist in maintaining design system documentation",
        "Evaluates basic AI-generated suggestions against established system patterns",
      ],
      p2_developing: [
        "Leverages AI to audit design system usage and identify adoption gaps across products",
        "Uses AI to generate component variations and token alternatives for design system expansion",
        "Applies AI to draft design system documentation, usage guidelines, and contribution guides",
        "Evaluates AI-generated component suggestions against design system principles and patterns",
      ],
      p3_career: [
        "Integrates AI into design system workflows for component auditing and quality assurance",
        "Uses AI to analyze design system adoption metrics and recommend improvements",
        "Develops prompt strategies for generating consistent, on-brand design system assets",
        "Combines AI analysis with design judgment to prioritize design system evolution",
      ],
      p4_advanced: [
        "Creates AI-powered design system governance processes that scale across teams",
        "Develops AI workflows that automate design system documentation and changelog generation",
        "Mentors designers on using AI to contribute to and extend the design system",
        "Identifies opportunities where AI can bridge the gap between design system and code",
      ],
      p5_principal: [
        "Shapes the organization's vision for AI-augmented design system operations at scale",
        "Pioneers AI-driven approaches to design system evolution, versioning, and deprecation",
        "Establishes standards for AI-assisted design system tooling across the organization",
        "Drives industry discourse on the intersection of AI and design systems infrastructure",
      ],
    },
  },
];

export default internalMutation({
  args: {
    roleId: v.optional(v.id("roles")),
    roleName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Resolve roleId from roleName if provided
    let roleId = args.roleId;
    if (!roleId && args.roleName) {
      const roles = await ctx.db.query("roles").collect();
      const match = roles.find(
        (r) => r.title.toLowerCase() === args.roleName!.toLowerCase()
      );
      if (!match) {
        return [{ competency: "-", subTitle: "-", action: `FAILED — role "${args.roleName}" not found` }];
      }
      roleId = match._id;
    }

    // 2. Get competencies (optionally scoped to a role)
    let competencies;
    if (roleId) {
      competencies = await ctx.db
        .query("competencies")
        .withIndex("by_roleId", (q) => q.eq("roleId", roleId))
        .collect();
    } else {
      competencies = await ctx.db
        .query("competencies")
        .collect();
    }

    const results: { competency: string; subTitle: string; action: string }[] = [];

    for (const spec of AI_SUB_COMPETENCIES) {
      // 2. Match competency by title (case-insensitive substring)
      const match = competencies.find((c) =>
        c.title.toLowerCase().includes(spec.competencyMatch)
      );

      if (!match) {
        results.push({
          competency: spec.competencyMatch,
          subTitle: spec.subTitle,
          action: "SKIPPED — competency not found",
        });
        continue;
      }

      // 3. Check if AI sub-competency already exists (idempotent)
      const existingSubs = await ctx.db
        .query("subCompetencies")
        .withIndex("by_competencyId", (q) => q.eq("competencyId", match._id))
        .collect();

      const alreadyExists = existingSubs.some(
        (s) => s.title.toLowerCase() === spec.subTitle.toLowerCase()
      );

      if (alreadyExists) {
        results.push({
          competency: match.title,
          subTitle: spec.subTitle,
          action: "SKIPPED — already exists",
        });
        continue;
      }

      // 4. Find max orderIndex among existing sub-competencies
      const maxOrder = existingSubs.reduce(
        (max, s) => Math.max(max, s.orderIndex),
        -1
      );

      // 5. Insert the new sub-competency
      await ctx.db.insert("subCompetencies", {
        competencyId: match._id,
        title: spec.subTitle,
        orderIndex: maxOrder + 1,
        levelCriteria: spec.levelCriteria,
      });

      results.push({
        competency: match.title,
        subTitle: spec.subTitle,
        action: `CREATED at orderIndex ${maxOrder + 1}`,
      });
    }

    return results;
  },
});
