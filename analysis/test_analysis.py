import unittest
from analyze import clean,describe,weighted_kappa,alpha,icc2,bootstrap_mean,experimental_contrast
class AnalysisTests(unittest.TestCase):
 def test_missing_denominator(self):
  result=describe([{'score':4,'maximum':4},{'score':None,'maximum':4},{'score':0,'maximum':4}]);self.assertEqual(result['applicable_maximum'],8);self.assertEqual(result['mean'],2);self.assertIsNone(describe([])['mean'])
 def test_kappa(self):
  self.assertEqual(weighted_kappa([0,1,4],[0,1,4]),1);self.assertIsNone(weighted_kappa([2,2],[2,2]));self.assertEqual(weighted_kappa([0,4],[4,0]),-1)
 def test_reliability(self):
  x=[[0,0],[1,1],[2,2],[4,4]];self.assertAlmostEqual(alpha(x),1);self.assertAlmostEqual(icc2(x),1);self.assertIsNone(icc2([[1,1],[1,1]]))
 def test_matrix_validation(self):
  self.assertRaises(ValueError,alpha,[[1,2],[1]]);self.assertRaises(ValueError,icc2,[[1,9],[2,3]])
 def test_bootstrap(self):
  self.assertEqual(bootstrap_mean([1,2,3]),bootstrap_mean([1,2,3]));self.assertIsNone(bootstrap_mean([2]))
 def test_contrast(self):self.assertEqual(experimental_contrast([2,4],[0,2])['difference'],2)
 def test_clean(self):
  row=dict(participant='p',item='i',version='1',dimension='justification',rater='a',occasion='pre',score='NA',maximum='4');self.assertIsNone(clean([row])[0]['score']);self.assertRaises(ValueError,clean,[row,row]);self.assertRaises(ValueError,clean,[{**row,'score':'nan'}])
if __name__=='__main__':unittest.main()
