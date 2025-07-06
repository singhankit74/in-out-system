
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users, Scan } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  const { user, profile } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-900">
              Hostel Management
            </CardTitle>
            <CardDescription className="text-lg">
              Digital In-Out Management System
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="font-semibold">For Students</h3>
                  <p className="text-sm text-gray-600">Request outpass & track status</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                <Shield className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="font-semibold">For Admins</h3>
                  <p className="text-sm text-gray-600">Approve requests & monitor</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg">
                <Scan className="h-8 w-8 text-purple-600" />
                <div>
                  <h3 className="font-semibold">For Guards</h3>
                  <p className="text-sm text-gray-600">Scan QR codes & log entries</p>
                </div>
              </div>
            </div>
            
            <Link to="/auth">
              <Button className="w-full py-6 text-lg">
                Get Started
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Redirect based on role
  if (profile.role === 'student') {
    window.location.href = '/student';
  } else if (profile.role === 'admin') {
    window.location.href = '/admin';
  } else if (profile.role === 'guard') {
    window.location.href = '/guard';
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
};

export default Index;
