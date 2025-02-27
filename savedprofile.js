import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Camera, Mail, MapPin, Calendar } from 'lucide-react';

const UserProfile = () => {
  // Sample user data - in real app, this would come from props or API
  const user = {
    name: "Sarah Wilson",
    email: "sarah.wilson@example.com",
    location: "San Francisco, CA",
    joinDate: "January 2024",
    profileComplete: 85,
    photoUploaded: true,
    stats: [
      { label: "Posts", value: 248 },
      { label: "Followers", value: 1423 },
      { label: "Following", value: 531 }
    ]
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <Card className="bg-white shadow-lg">
        <CardHeader className="relative pb-24">
          {/* Profile Header Background */}
          <div className="absolute inset-0 h-32 bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-lg" />
          
          {/* Profile Picture */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
            <div className="relative">
              {user.photoUploaded ? (
                <img
                  src="/api/placeholder/120/120"
                  alt="Profile"
                  className="w-24 h-24 rounded-full border-4 border-white object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <Badge className="absolute bottom-0 right-0 bg-green-500">
                {user.profileComplete}%
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-16">
          {/* User Info */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">{user.name}</h2>
            <div className="flex items-center justify-center gap-2 text-gray-600 mt-2">
              <Mail className="w-4 h-4" />
              <span>{user.email}</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-gray-600 mt-1">
              <MapPin className="w-4 h-4" />
              <span>{user.location}</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-gray-600 mt-1">
              <Calendar className="w-4 h-4" />
              <span>Joined {user.joinDate}</span>
            </div>
          </div>

          {/* Profile Completion Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Profile Completion</span>
              <span className="font-medium">{user.profileComplete}%</span>
            </div>
            <Progress value={user.profileComplete} className="h-2" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-center border-t pt-6">
            {user.stats.map((stat, index) => (
              <div key={stat.label} className={`${index !== 0 ? 'border-l' : ''}`}>
                <div className="text-2xl font-bold text-gray-800">
                  {stat.value.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfile;