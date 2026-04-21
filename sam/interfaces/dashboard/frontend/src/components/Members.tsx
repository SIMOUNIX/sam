import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Member } from "@/types";

export function Members({ members }: { members: Member[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
          Known members
          <Badge variant="secondary">{members.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Family</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Discord ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} style={{ textAlign: "center", color: "var(--muted-foreground)", fontStyle: "italic" }}>
                  no members configured
                </TableCell>
              </TableRow>
            ) : (
              members.map(m => (
                <TableRow key={m.discord_id}>
                  <TableCell style={{ fontFamily: "monospace" }}>{m.family}</TableCell>
                  <TableCell>{m.firstname}</TableCell>
                  <TableCell style={{ fontFamily: "monospace", fontSize: 12, color: "var(--muted-foreground)" }}>{m.discord_id}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
