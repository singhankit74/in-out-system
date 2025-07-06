
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import QRScanner from '@/components/QRScanner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Scan, History } from 'lucide-react';

interface OutpassRequest {
  id: string;
  reason: string;
  destination: string;
  from_time: string;
  to_time: string;
  qr_code: string;
  profiles: {
    full_name: string;
    student_id: string;
    room_number: string;
  } | null;
}

interface InOutLog {
  id: string;
  log_type: 'in' | 'out';
  timestamp: string;
  is_late: boolean;
  notes: string;
  profiles: {
    full_name: string;
    student_id: string;
  } | null;
}

export default function GuardDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [showScanner, setShowScanner] = useState(false);
  const [approvedOutpasses, setApprovedOutpasses] = useState<OutpassRequest[]>([]);
  const [recentLogs, setRecentLogs] = useState<InOutLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovedOutpasses();
    fetchRecentLogs();
  }, []);

  const fetchApprovedOutpasses = async () => {
    const { data, error } = await supabase
      .from('outpass_requests')
      .select(`
        *,
        profiles!outpass_requests_student_id_fkey (
          full_name,
          student_id,
          room_number
        )
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching outpasses:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch approved outpasses",
      });
    } else {
      setApprovedOutpasses(data || []);
    }
    setLoading(false);
  };

  const fetchRecentLogs = async () => {
    const { data, error } = await supabase
      .from('in_out_logs')
      .select(`
        *,
        profiles!in_out_logs_student_id_fkey (
          full_name,
          student_id
        )
      `)
      .order('timestamp', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching logs:', error);
    } else {
      setRecentLogs(data || []);
    }
  };

  const handleQRScanSuccess = () => {
    fetchRecentLogs();
    setShowScanner(false);
  };

  if (loading) {
    return (
      <Layout title="Guard Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Guard Dashboard">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              QR Code Scanner
            </CardTitle>
            <CardDescription>
              Scan student QR codes to record entry and exit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setShowScanner(!showScanner)}
              className="mb-4"
            >
              {showScanner ? 'Close Scanner' : 'Open Scanner'}
            </Button>
            {showScanner && (
              <QRScanner 
                onClose={() => setShowScanner(false)}
                onScanSuccess={handleQRScanSuccess}
              />
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="logs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="logs">Recent Logs</TabsTrigger>
            <TabsTrigger value="outpasses">Approved Outpasses</TabsTrigger>
          </TabsList>
          
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recent Entry/Exit Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{log.profiles?.full_name || 'Unknown'}</p>
                        <p className="text-sm text-gray-600">ID: {log.profiles?.student_id || 'N/A'}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={log.log_type === 'out' ? 'destructive' : 'default'}>
                          {log.log_type.toUpperCase()}
                        </Badge>
                        {log.is_late && (
                          <Badge variant="outline" className="text-orange-600">
                            Late
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {recentLogs.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No recent logs</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="outpasses">
            <Card>
              <CardHeader>
                <CardTitle>Approved Outpasses</CardTitle>
                <CardDescription>
                  Currently approved outpass requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {approvedOutpasses.map((outpass) => (
                    <div key={outpass.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{outpass.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-gray-600">
                            ID: {outpass.profiles?.student_id || 'N/A'} | Room: {outpass.profiles?.room_number || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-600">
                            Destination: {outpass.destination}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(outpass.from_time).toLocaleString()} - {new Date(outpass.to_time).toLocaleString()}
                          </p>
                        </div>
                        <Badge>Approved</Badge>
                      </div>
                    </div>
                  ))}
                  {approvedOutpasses.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No approved outpasses</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
