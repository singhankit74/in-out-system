
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { X, Camera, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QrScanner from 'qr-scanner';

interface QRScannerProps {
  onClose: () => void;
  onScanSuccess: () => void;
}

export default function QRScanner({ onClose, onScanSuccess }: QRScannerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [scannedData, setScannedData] = useState<any>(null);
  const [logType, setLogType] = useState<'in' | 'out'>('out');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);

  useEffect(() => {
    startScanner();
    return () => stopScanner();
  }, []);

  const startScanner = async () => {
    if (!videoRef.current) return;

    try {
      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          try {
            const data = JSON.parse(result.data);
            setScannedData(data);
            stopScanner();
          } catch (error) {
            toast({
              variant: "destructive",
              title: "Invalid QR Code",
              description: "This QR code is not valid for outpass verification.",
            });
          }
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );

      scannerRef.current = scanner;
      await scanner.start();
      setScannerReady(true);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
      });
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
  };

  const handleManualEntry = () => {
    const manualData = prompt("Enter QR code data manually:");
    if (manualData) {
      try {
        const data = JSON.parse(manualData);
        setScannedData(data);
        stopScanner();
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Invalid Data",
          description: "The entered data is not valid JSON.",
        });
      }
    }
  };

  const recordLog = async () => {
    if (!scannedData || !user) return;

    setLoading(true);

    // Check if outpass is still valid
    const { data: outpass } = await supabase
      .from('outpass_requests')
      .select('*')
      .eq('id', scannedData.outpass_id)
      .eq('status', 'approved')
      .single();

    if (!outpass) {
      toast({
        variant: "destructive",
        title: "Invalid Outpass",
        description: "This outpass is not found or not approved.",
      });
      setLoading(false);
      return;
    }

    // Check if student is late (for IN entries)
    const isLate = logType === 'in' && new Date() > new Date(outpass.to_time);

    const { error } = await supabase
      .from('in_out_logs')
      .insert({
        student_id: scannedData.student_id,
        outpass_id: scannedData.outpass_id,
        log_type: logType,
        scanned_by: user.id,
        is_late: isLate,
        notes: notes || null,
      });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to record log entry.",
      });
    } else {
      toast({
        title: "Success",
        description: `${logType.toUpperCase()} entry recorded successfully!`,
        ...(isLate && {
          variant: "destructive",
          description: `${logType.toUpperCase()} entry recorded - STUDENT IS LATE!`,
        }),
      });
      onScanSuccess();
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>QR Code Scanner</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!scannedData ? (
            <div className="space-y-4">
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full h-64 bg-black rounded-lg"
                  playsInline
                />
                {!scannerReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-lg">
                    <div className="text-center text-white">
                      <Camera className="h-8 w-8 mx-auto mb-2" />
                      <p>Starting camera...</p>
                    </div>
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                onClick={handleManualEntry}
                className="w-full"
              >
                Enter Code Manually
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">QR Code Scanned!</h4>
                <div className="text-sm text-green-700">
                  <p><strong>Destination:</strong> {scannedData.destination}</p>
                  <p><strong>Valid until:</strong> {new Date(scannedData.to_time).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Entry Type</Label>
                <Select value={logType} onValueChange={(value: 'in' | 'out') => setLogType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="out">OUT - Student Leaving</SelectItem>
                    <SelectItem value="in">IN - Student Returning</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={3}
                />
              </div>

              {logType === 'in' && new Date() > new Date(scannedData.to_time) && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="text-red-800 font-semibold">Student is returning late!</span>
                </div>
              )}

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setScannedData(null);
                    startScanner();
                  }}
                  className="flex-1"
                >
                  Scan Again
                </Button>
                <Button
                  onClick={recordLog}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? "Recording..." : "Record Entry"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
