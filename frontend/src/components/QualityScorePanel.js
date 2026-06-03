import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Gauge, Loader2, RefreshCw } from "lucide-react";

const tier = (s) => (s >= 90 ? "sage" : s >= 70 ? "caramel" : "rose");
const tierColor = { sage: "hsl(168 35% 34%)", caramel: "hsl(28 51% 43%)", rose: "hsl(0 72% 52%)" };
const tierLabel = { sage: "Excellent", caramel: "Good", rose: "Needs work" };

export const QualityScorePanel = ({ score, loading, onScore }) => {
  const overall = score?.overall_score ?? null;
  const t = overall != null ? tier(overall) : "caramel";
  const breakdown = score?.breakdown || {};

  return (
    <Card className="cs-card p-4 sm:p-5 space-y-4" data-testid="quality-score-panel">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Gauge className="h-[18px] w-[18px] text-primary" /> Quality Score
        </h3>
        <Button size="sm" variant="secondary" className="rounded-xl gap-2" onClick={onScore} disabled={loading} data-testid="quality-score-run-button">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {overall != null ? "Re-score" : "Score"}
        </Button>
      </div>

      {overall == null ? (
        <div className="text-sm text-muted-foreground py-6 text-center">
          Run a quality check to see how this content scores on readability, SEO, engagement & more.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4"
              style={{ borderColor: tierColor[t], color: tierColor[t] }}
            >
              <span className="font-display text-2xl font-bold" data-testid="quality-score-value">{overall}</span>
            </div>
            <div>
              <Badge style={{ background: tierColor[t], color: "white" }}>{tierLabel[t]}</Badge>
              <p className="mt-1 text-xs text-muted-foreground">Overall content quality out of 100</p>
            </div>
          </div>

          <div className="space-y-2">
            {Object.entries(breakdown).map(([k, v]) => (
              <div key={k}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="capitalize text-muted-foreground">{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${v}%`, background: tierColor[tier(v)] }} />
                </div>
              </div>
            ))}
          </div>

          {score?.suggestions?.length > 0 && (
            <Accordion type="single" collapsible data-testid="quality-score-rubric-accordion">
              <AccordionItem value="sug" className="border-b-0">
                <AccordionTrigger className="text-sm py-2">Improvement suggestions ({score.suggestions.length})</AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 text-sm text-muted-foreground" data-testid="quality-score-suggestions">
                    {score.suggestions.map((s, i) => (
                      <li key={i} className="flex gap-2"><span className="text-primary">•</span><span>{s}</span></li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </>
      )}
    </Card>
  );
};
