/**
 * Image Approval Panel (Phase 3)
 *
 * Simplified MVP workflow - no placeholders:
 * 1. Show image needs (text descriptions only)
 * 2. User approves/rejects descriptions
 * 3. Generate final images for approved descriptions
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImageNeed } from '../../types/portfolio';

interface ImageApprovalPanelProps {
  artifactId: string;
  imageNeeds: ImageNeed[];
  onApprove: (ids: string[]) => Promise<void>;
  onReject: (ids: string[]) => Promise<void>;
  onGenerateFinals: () => Promise<void>;
  isLoading?: boolean;
}

export function ImageApprovalPanel({
  artifactId: _artifactId,
  imageNeeds,
  onApprove,
  onReject,
  onGenerateFinals,
  isLoading = false,
}: ImageApprovalPanelProps) {
  void _artifactId; // Intentionally unused for now
  const [_selectedIds, _setSelectedIds] = useState<Set<string>>(new Set());
  void _selectedIds; void _setSelectedIds; // Intentionally unused for now
  const [approvedIds, setApprovedIds] = useState<Set<string>>(
    new Set(imageNeeds.filter((n) => n.approved).map((n) => n.id))
  );
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);

  const handleApprove = async (id: string) => {
    const newApproved = new Set(approvedIds).add(id);
    const newRejected = new Set(rejectedIds);
    newRejected.delete(id);

    setApprovedIds(newApproved);
    setRejectedIds(newRejected);

    try {
      await onApprove([id]);
    } catch (error) {
      // Revert on error
      setApprovedIds(approvedIds);
      setRejectedIds(rejectedIds);
    }
  };

  const handleReject = async (id: string) => {
    const newRejected = new Set(rejectedIds).add(id);
    const newApproved = new Set(approvedIds);
    newApproved.delete(id);

    setRejectedIds(newRejected);
    setApprovedIds(newApproved);

    try {
      await onReject([id]);
    } catch (error) {
      // Revert on error
      setRejectedIds(rejectedIds);
      setApprovedIds(approvedIds);
    }
  };

  const handleApproveAll = async () => {
    const allIds = imageNeeds.map((n) => n.id);
    setApprovedIds(new Set(allIds));
    setRejectedIds(new Set());

    try {
      await onApprove(allIds);
    } catch (error) {
      // Revert on error
      setApprovedIds(approvedIds);
      setRejectedIds(rejectedIds);
    }
  };

  const handleGenerateFinals = async () => {
    setProcessing(true);
    try {
      await onGenerateFinals();
    } finally {
      setProcessing(false);
    }
  };

  const approvedCount = approvedIds.size;
  const canGenerateFinals = approvedCount > 0 && !processing;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-purple-500" />
            Review Image Descriptions
          </CardTitle>
          <CardDescription>
            Approve or reject image descriptions. Final images will be generated for approved
            descriptions only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant="outline">{approvedCount} approved</Badge>
            <Badge variant="outline">{rejectedIds.size} rejected</Badge>
            <div className="flex-1" />
            <Button variant="outline" onClick={handleApproveAll} disabled={isLoading || processing}>
              Approve All
            </Button>
            <Button onClick={handleGenerateFinals} disabled={!canGenerateFinals || isLoading}>
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                `Generate ${approvedCount} Final Images`
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Image Needs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {imageNeeds.map((need) => {
          const isApproved = approvedIds.has(need.id);
          const isRejected = rejectedIds.has(need.id);

          return (
            <Card
              key={need.id}
              className={cn(
                'transition-all',
                isApproved && 'ring-2 ring-green-500',
                isRejected && 'ring-2 ring-red-500 opacity-50'
              )}
            >
              <CardContent className="p-4 space-y-3">
                {/* Visual Placeholder */}
                <div className="relative aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center">
                  <div className="text-center p-4 space-y-2">
                    <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      {need.purpose === 'photo' && 'Photo'}
                      {need.purpose === 'illustration' && 'Illustration'}
                      {need.purpose === 'diagram' && 'Diagram'}
                      {need.purpose === 'screenshot' && 'Screenshot'}
                      {need.purpose === 'chart' && 'Chart'}
                    </p>
                  </div>

                  {/* Status Badge */}
                  {isApproved && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-green-500 text-white">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Approved
                      </Badge>
                    </div>
                  )}
                  {isRejected && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Rejected
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">{need.description}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {need.purpose}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {need.style}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Placement: {need.placement_after}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!isApproved && !isRejected && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApprove(need.id)}
                        className="flex-1"
                        disabled={isLoading || processing}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(need.id)}
                        className="flex-1"
                        disabled={isLoading || processing}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                  {isApproved && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(need.id)}
                      className="flex-1"
                      disabled={isLoading || processing}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  )}
                  {isRejected && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApprove(need.id)}
                      className="flex-1"
                      disabled={isLoading || processing}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
