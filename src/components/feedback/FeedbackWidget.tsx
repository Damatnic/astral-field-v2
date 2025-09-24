import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageCircle, 
  Bug, 
  Lightbulb, 
  Star, 
  Send, 
  X, 
  Camera,
  ChevronDown
} from 'lucide-react';

interface FeedbackWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'bug' | 'feature_request' | 'general' | 'ui_ux' | 'performance';
}

export default function FeedbackWidget({ isOpen, onClose, initialType = 'general' }: FeedbackWidgetProps) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    type: initialType,
    category: 'general',
    title: '',
    description: '',
    priority: 'medium',
    steps: '',
    expectedBehavior: '',
    actualBehavior: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    setIsSubmitting(true);
    
    try {
      const submission = {
        ...formData,
        userId: session.user.id,
        rating: rating || undefined,
        browserInfo: navigator.userAgent,
        pageUrl: window.location.href
      };

      const response = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission)
      });

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => {
          onClose();
          setSubmitted(false);
          setFormData({
            type: 'general',
            category: 'general',
            title: '',
            description: '',
            priority: 'medium',
            steps: '',
            expectedBehavior: '',
            actualBehavior: ''
          });
          setRating(null);
        }, 2000);
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const StarRating = () => (
    <div className="flex gap-1 items-center">
      <Label className="text-sm font-medium">Rate your experience:</Label>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 cursor-pointer transition-colors ${
              rating && star <= rating
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300 hover:text-yellow-200'
            }`}
            onClick={() => setRating(star)}
          />
        ))}
      </div>
      {rating && (
        <span className="text-sm text-gray-600 ml-2">
          {rating === 1 && 'Poor'}
          {rating === 2 && 'Fair'}
          {rating === 3 && 'Good'}
          {rating === 4 && 'Very Good'}
          {rating === 5 && 'Excellent'}
        </span>
      )}
    </div>
  );

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <div className="text-green-500 mb-4">
              <MessageCircle className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Thank you!</h3>
            <p className="text-gray-600">
              Your feedback has been submitted and will be reviewed by our team.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Send Feedback
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs defaultValue={formData.type} value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general" className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  <span className="hidden sm:inline">General</span>
                </TabsTrigger>
                <TabsTrigger value="bug" className="flex items-center gap-1">
                  <Bug className="h-3 w-3" />
                  <span className="hidden sm:inline">Bug</span>
                </TabsTrigger>
                <TabsTrigger value="feature_request" className="flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" />
                  <span className="hidden sm:inline">Feature</span>
                </TabsTrigger>
                <TabsTrigger value="ui_ux" className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  <span className="hidden sm:inline">UI/UX</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <StarRating />
                <div>
                  <Label htmlFor="title">Subject</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Brief description of your feedback"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Details</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Please provide more details about your feedback..."
                    className="min-h-[100px]"
                    required
                  />
                </div>
              </TabsContent>

              <TabsContent value="bug" className="space-y-4">
                <div>
                  <Label htmlFor="bug-title">Bug Title</Label>
                  <Input
                    id="bug-title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Brief description of the bug"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="trades">Trades</SelectItem>
                        <SelectItem value="scoring">Scoring</SelectItem>
                        <SelectItem value="mobile">Mobile</SelectItem>
                        <SelectItem value="performance">Performance</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="steps">Steps to Reproduce</Label>
                  <Textarea
                    id="steps"
                    value={formData.steps}
                    onChange={(e) => handleInputChange('steps', e.target.value)}
                    placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
                    className="min-h-[80px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expected">Expected Behavior</Label>
                    <Textarea
                      id="expected"
                      value={formData.expectedBehavior}
                      onChange={(e) => handleInputChange('expectedBehavior', e.target.value)}
                      placeholder="What should happen?"
                      className="min-h-[60px]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="actual">Actual Behavior</Label>
                    <Textarea
                      id="actual"
                      value={formData.actualBehavior}
                      onChange={(e) => handleInputChange('actualBehavior', e.target.value)}
                      placeholder="What actually happens?"
                      className="min-h-[60px]"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="feature_request" className="space-y-4">
                <div>
                  <Label htmlFor="feature-title">Feature Title</Label>
                  <Input
                    id="feature-title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Name of the feature you'd like to see"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="trades">Trades</SelectItem>
                      <SelectItem value="scoring">Scoring</SelectItem>
                      <SelectItem value="mobile">Mobile App</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="feature-description">Description</Label>
                  <Textarea
                    id="feature-description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe the feature and how it would help you..."
                    className="min-h-[120px]"
                    required
                  />
                </div>
              </TabsContent>

              <TabsContent value="ui_ux" className="space-y-4">
                <StarRating />
                <div>
                  <Label htmlFor="ui-title">Subject</Label>
                  <Input
                    id="ui-title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="UI/UX improvement suggestion"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="ui-description">Suggestion</Label>
                  <Textarea
                    id="ui-description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Tell us what could be improved about the user experience..."
                    className="min-h-[100px]"
                    required
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-xs text-gray-500">
                <p>Browser: {navigator.userAgent.split(' ')[0]}</p>
                <p>Page: {window.location.pathname}</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Sending...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Send Feedback
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}