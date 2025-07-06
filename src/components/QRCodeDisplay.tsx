
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';
import QRCode from 'qrcode';
import { Database } from '@/integrations/supabase/types';

type OutpassRequest = Database['public']['Tables']['outpass_requests']['Row'];

interface QRCodeDisplayProps {
  request: OutpassRequest;
  onClose: () => void;
}

export default function QRCodeDisplay({ request, onClose }: QRCodeDisplayProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    generateQRCode();
  }, [request]);

  const generateQRCode = async () => {
    const qrData = JSON.stringify({
      outpass_id: request.id,
      student_id: request.student_id,
      destination: request.destination,
      from_time: request.from_time,
      to_time: request.to_time,
    });

    try {
      const url = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Outpass QR Code</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="text-center">
          {qrCodeUrl && (
            <div className="space-y-4">
              <img src={qrCodeUrl} alt="QR Code" className="mx-auto" />
              <div className="text-sm text-gray-600">
                <p><strong>Destination:</strong> {request.destination}</p>
                <p><strong>Valid until:</strong> {new Date(request.to_time).toLocaleString()}</p>
              </div>
              <p className="text-xs text-gray-500">
                Show this QR code to the guard when entering/exiting
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
