
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, QrCode, Clock, MapPin } from 'lucide-react';
import Layout from '@/components/Layout';
import OutpassRequestForm from '@/components/OutpassRequestForm';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import { Database } from '@/integrations/supabase/types';
import { format } from 'date-fns';

type OutpassRequest = Database['public']['Tables']['outpass_requests']['Row'];

export default function StudentDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<OutpassRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<OutpassRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('outpass_requests')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });
    
    setRequests(data || []);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <Layout title="Student Dashboard">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Student Dashboard">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">My Outpass Requests</h2>
          <Button onClick={() => setShowForm(true)} size="lg" className="md:text-base">
            <Plus className="h-5 w-5 mr-2" />
            New Request
          </Button>
        </div>

        {requests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 mb-4">No outpass requests yet</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Request
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
            {requests.map((request) => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{request.destination}</CardTitle>
                      <CardDescription>{request.reason}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(request.status)}>
                      {request.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      <div>
                        <p>From: {format(new Date(request.from_time), 'MMM dd, HH:mm')}</p>
                        <p>To: {format(new Date(request.to_time), 'MMM dd, HH:mm')}</p>
                      </div>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>{request.destination}</span>
                    </div>
                  </div>
                  
                  {request.status === 'approved' && (
                    <div className="mt-4 pt-4 border-t">
                      <Button 
                        onClick={() => setSelectedRequest(request)}
                        variant="outline" 
                        size="sm"
                        className="w-full"
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        Show QR Code
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {showForm && (
          <OutpassRequestForm 
            onClose={() => setShowForm(false)} 
            onSuccess={() => {
              setShowForm(false);
              fetchRequests();
            }}
          />
        )}

        {selectedRequest && (
          <QRCodeDisplay 
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
          />
        )}
      </div>
    </Layout>
  );
}
