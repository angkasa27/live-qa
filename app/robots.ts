import type { MetadataRoute } from "next";

/**
 * Nothing on this site is indexed, deliberately and site-wide.
 *
 * ROADMAP.md §8: a searchable archive of a named scholar's answers, typed from memory by a
 * volunteer, is a fatwa database, and a mistyped or out-of-context entry is attributed to a real
 * person. Until that question has a real answer, the whole site stays out of search engines
 * rather than page by page — a per-route rule is one forgotten `generateMetadata` away from
 * leaking the exact pages that matter most.
 *
 * This is a crawler's *request* not to index. It is not access control, so it is paired with the
 * `noindex` header in app/layout.tsx, and it is not what keeps a hidden majelis private: that is
 * enforced in lib/queries.ts, which will not return one to any public path.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
