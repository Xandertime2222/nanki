import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { CheckSquare, ThumbsUp, ThumbsDown, Pencil } from "lucide-react";
import { toast } from "sonner";

export function ReviewView() {
  return (
    <div className="p-6 space-y-6" data-testid="review-view">
      <div className="flex items-center gap-3">
        <CheckSquare className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Review</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Card Review</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <CheckSquare className="h-12 w-12 mb-4 opacity-20" />
          <p>No cards to review. Generate cards from the analysis view.</p>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={() => toast.info("Rejected")}>
          <ThumbsDown className="h-4 w-4 mr-2" /> Reject
        </Button>
        <Button variant="outline" onClick={() => toast.info("Edit mode")}>
          <Pencil className="h-4 w-4 mr-2" /> Edit
        </Button>
        <Button onClick={() => toast.success("Card accepted")}>
          <ThumbsUp className="h-4 w-4 mr-2" /> Accept
        </Button>
      </div>
    </div>
  );
}